import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { OrderService } from './order.service';

function loginAs(id: string, role: 'CLIENT' | 'SELLER') {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  localStorage.setItem('buy01.auth.token', `h.${payload}.s`);
  localStorage.setItem('buy01.auth.user', JSON.stringify({ id, name: id, email: `${id}@t.com`, role }));
}

const address = { fullName: 'A', phone: '0612345678', street: '1 Rue', city: 'Rabat', postalCode: '10000' };
const lines = [
  { productId: 'p1', name: 'Lamp', price: 20, quantity: 1, imageUrl: null },
  { productId: 'p2', name: 'Mug', price: 5, quantity: 1, imageUrl: null },
];

async function expectStatus(promise: Promise<unknown>, status: number) {
  await expect(promise).rejects.toSatisfy((e: unknown) => e instanceof HttpErrorResponse && e.status === status);
}

describe('OrderService (local implementation)', () => {
  let service: OrderService;

  const place = () =>
    firstValueFrom(
      service.placeOrder(
        { items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }], address, paymentMethod: 'PAY_ON_DELIVERY' },
        lines,
      ),
    );

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(OrderService);
  });

  it('places a pay-on-delivery order with the right total', async () => {
    loginAs('buyer', 'CLIENT');
    const order = await place();
    expect(order.status).toBe('PENDING');
    expect(order.total).toBe(45);
    expect(order.reference).toMatch(/^B01-[A-Z0-9]{5}$/);
  });

  it('does not let a seller place an order (403)', async () => {
    loginAs('shop', 'SELLER');
    await expectStatus(place(), 403);
  });

  it('only shows a buyer their own orders', async () => {
    loginAs('buyer', 'CLIENT');
    const order = await place();
    loginAs('other', 'CLIENT');
    expect(await firstValueFrom(service.myOrders())).toEqual([]);
    await expectStatus(firstValueFrom(service.getOrder(order.id)), 403);
  });

  it('searches and filters orders', async () => {
    loginAs('buyer', 'CLIENT');
    await place();
    expect((await firstValueFrom(service.myOrders({ q: 'lamp' }))).length).toBe(1);
    expect((await firstValueFrom(service.myOrders({ q: 'sofa' }))).length).toBe(0);
    expect((await firstValueFrom(service.myOrders({ status: 'CANCELLED' }))).length).toBe(0);
  });

  it('cancels before shipping, refuses after (409)', async () => {
    loginAs('buyer', 'CLIENT');
    const first = await place();
    expect((await firstValueFrom(service.cancelOrder(first.id))).status).toBe('CANCELLED');

    const second = await place();
    loginAs('shop', 'SELLER');
    await firstValueFrom(service.advanceStatus(second.id, ['p1'])); // CONFIRMED
    await firstValueFrom(service.advanceStatus(second.id, ['p1'])); // SHIPPED
    loginAs('buyer', 'CLIENT');
    await expectStatus(firstValueFrom(service.cancelOrder(second.id)), 409);
  });

  it('lets a seller see and update only orders with their products', async () => {
    loginAs('buyer', 'CLIENT');
    const order = await place();
    loginAs('shop', 'SELLER');

    const views = await firstValueFrom(service.sellerOrders(['p2']));
    expect(views.length).toBe(1);
    expect(views[0].items.map((i) => i.productId)).toEqual(['p2']);
    expect(views[0].sellerTotal).toBe(5);

    await expectStatus(firstValueFrom(service.advanceStatus(order.id, ['p9'])), 403);
  });

  it('computes buyer and seller analytics without cancelled orders', async () => {
    loginAs('buyer', 'CLIENT');
    await place();
    const cancelled = await place();
    await firstValueFrom(service.cancelOrder(cancelled.id));

    const buyer = await firstValueFrom(service.buyerStats());
    expect(buyer).toMatchObject({ totalSpent: 45, orderCount: 1, itemsBought: 3 });
    expect(buyer.topProducts[0].productId).toBe('p1');

    loginAs('shop', 'SELLER');
    const seller = await firstValueFrom(service.sellerStats(['p1']));
    expect(seller).toMatchObject({ revenue: 40, unitsSold: 2, orderCount: 1 });
    expect(seller.bestSellers[0].name).toBe('Lamp');
  });
});
