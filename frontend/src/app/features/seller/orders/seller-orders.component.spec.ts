import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { SellerOrdersComponent, matchesOrder } from './seller-orders.component';
import { AuthService } from '../../auth/auth.service';
import { OrderService, SellerOrderView } from '../../../shared/services/order.service';
import { ProductService } from '../../../shared/services/product-service';

describe('SellerOrdersComponent', () => {
  const pendingOrder = {
    order: { id: '1', reference: 'B01-AAA', buyerName: 'Amina', status: 'PENDING', items: [{ name: 'Bowl' }], address: { city: 'Rabat' }, createdAt: '2026-11-01T10:00:00Z' },
    items: [{ productId: 'a', name: 'Bowl', price: 10, quantity: 2 }],
    sellerTotal: 20,
  } as unknown as SellerOrderView;
  const deliveredOrder = {
    order: { id: '2', reference: 'B01-BBB', buyerName: 'Lucas', status: 'DELIVERED', items: [{ name: 'Mug' }], address: { city: 'Fes' }, createdAt: '2026-11-02T10:00:00Z' },
    items: [{ productId: 'a', name: 'Mug', price: 5, quantity: 1 }],
    sellerTotal: 5,
  } as unknown as SellerOrderView;
  const orderService = { sellerOrders: vi.fn(), advanceStatus: vi.fn() };
  let searchText: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    searchText = {};
    orderService.sellerOrders.mockReturnValue(of([pendingOrder, deliveredOrder]));
    TestBed.configureTestingModule({
      imports: [SellerOrdersComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: ProductService, useValue: { getProductsOwnedBy: () => of([{ id: 'a' }]) } },
        { provide: OrderService, useValue: orderService },
        { provide: ActivatedRoute, useFactory: () => ({ snapshot: { queryParamMap: convertToParamMap(searchText) }, queryParamMap: of(convertToParamMap(searchText)) }) },
      ],
    });
    vi.spyOn(TestBed.inject(AuthService), 'getStoredUser').mockReturnValue({ id: 's', name: 'S', email: 's@x.com', role: 'SELLER' });
  });

  it('matchesOrder finds an order by number, buyer or product', () => {
    expect(matchesOrder(pendingOrder, 'b01-aaa')).toBe(true);
    expect(matchesOrder(pendingOrder, 'amina')).toBe(true);
    expect(matchesOrder(pendingOrder, 'bowl')).toBe(true);
    expect(matchesOrder(pendingOrder, 'zzz')).toBe(false);
  });

  it('shows one row per order', () => {
    const fixture = TestBed.createComponent(SellerOrdersComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-testid=order-row]').length).toBe(2);
  });

  it('shows only the orders of the chosen status tab', () => {
    const fixture = TestBed.createComponent(SellerOrdersComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-status=DELIVERED]').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-testid=order-row]').length).toBe(1);
  });

  it('filters the orders with the ?q= search from the URL', () => {
    searchText = { q: 'lucas' };

    const fixture = TestBed.createComponent(SellerOrdersComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-testid=order-row]').length).toBe(1);
  });

  it('calls advanceStatus when the seller advances an order', () => {
    orderService.advanceStatus.mockReturnValue(of({ ...pendingOrder.order, status: 'CONFIRMED' }));
    const fixture = TestBed.createComponent(SellerOrdersComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid=advance]').click();

    expect(orderService.advanceStatus).toHaveBeenCalledWith('1', ['a']);
  });

  it('shows "No orders yet" when there are no orders', () => {
    orderService.sellerOrders.mockReturnValue(of([]));

    const fixture = TestBed.createComponent(SellerOrdersComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No orders yet');
  });
});
