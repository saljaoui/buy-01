import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { OrderService } from './order.service';
import { AuthService } from '../../features/auth/auth.service';
import { PlaceOrderRequest } from '../../core/models/commerce.models';

describe('OrderService', () => {
  let service: OrderService;
  const auth = { getAuthenticatedUser: vi.fn() };

  const buyer = { id: 'buyer-1', name: 'Amina', email: 'a@x.com', role: 'CLIENT' };
  const otherBuyer = { id: 'buyer-2', name: 'Lucas', email: 'l@x.com', role: 'CLIENT' };
  const seller = { id: 'seller-1', name: 'Shop', email: 's@x.com', role: 'SELLER' };

  const address = { fullName: 'Amina', phone: '0612345678', street: '1 Rue', city: 'Rabat', postalCode: '10000' };
  const request: PlaceOrderRequest = { items: [{ productId: 'p1', quantity: 2 }], address, paymentMethod: 'PAY_ON_DELIVERY' };
  const lines = [{ productId: 'p1', name: 'Lamp', price: 20, quantity: 2, imageUrl: null }];

  beforeEach(() => {
    localStorage.clear();
    auth.getAuthenticatedUser.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: auth }] });
    service = TestBed.inject(OrderService);
  });

  it('places an order with status PENDING and the right total', async () => {
    auth.getAuthenticatedUser.mockReturnValue(buyer);

    const order = await firstValueFrom(service.placeOrder(request, lines));

    expect(order.status).toBe('PENDING');
    expect(order.total).toBe(40);
    expect(order.buyerId).toBe('buyer-1');
  });

  it('refuses an order from a seller (403)', async () => {
    auth.getAuthenticatedUser.mockReturnValue(seller);

    const result = firstValueFrom(service.placeOrder(request, lines));

    await expect(result).rejects.toMatchObject({ status: 403 });
  });

  it('refuses an empty order (400)', async () => {
    auth.getAuthenticatedUser.mockReturnValue(buyer);

    const result = firstValueFrom(service.placeOrder({ ...request, items: [] }, lines));

    await expect(result).rejects.toMatchObject({ status: 400 });
  });

  it('myOrders returns only the orders of the logged-in buyer', async () => {
    auth.getAuthenticatedUser.mockReturnValue(buyer);
    await firstValueFrom(service.placeOrder(request, lines));

    auth.getAuthenticatedUser.mockReturnValue(otherBuyer);
    const orders = await firstValueFrom(service.myOrders());

    expect(orders).toEqual([]);
  });

  it("getOrder refuses another buyer's order (403)", async () => {
    auth.getAuthenticatedUser.mockReturnValue(buyer);
    const order = await firstValueFrom(service.placeOrder(request, lines));

    auth.getAuthenticatedUser.mockReturnValue(otherBuyer);
    const result = firstValueFrom(service.getOrder(order.id));

    await expect(result).rejects.toMatchObject({ status: 403 });
  });

  it('cancelOrder cancels a pending order', async () => {
    auth.getAuthenticatedUser.mockReturnValue(buyer);
    const order = await firstValueFrom(service.placeOrder(request, lines));

    const cancelled = await firstValueFrom(service.cancelOrder(order.id));

    expect(cancelled.status).toBe('CANCELLED');
  });

  it('advanceStatus confirms an order that contains the seller product', async () => {
    auth.getAuthenticatedUser.mockReturnValue(buyer);
    const order = await firstValueFrom(service.placeOrder(request, lines));

    auth.getAuthenticatedUser.mockReturnValue(seller);
    const updated = await firstValueFrom(service.advanceStatus(order.id, ['p1']));

    expect(updated.status).toBe('CONFIRMED');
  });

  it('advanceStatus refuses an order without the seller products (403)', async () => {
    auth.getAuthenticatedUser.mockReturnValue(buyer);
    const order = await firstValueFrom(service.placeOrder(request, lines));

    auth.getAuthenticatedUser.mockReturnValue(seller);
    const result = firstValueFrom(service.advanceStatus(order.id, ['other-product']));

    await expect(result).rejects.toMatchObject({ status: 403 });
  });
});
