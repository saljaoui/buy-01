import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { SellerOrdersComponent, matchesOrder } from './seller-orders.component';
import { AuthService } from '../../auth/auth.service';
import { OrderService, SellerOrderView } from '../../../shared/services/order.service';
import { ProductService } from '../../../shared/services/product-service';

const v = (id: string, status: string, buyer: string): SellerOrderView =>
  ({
    order: { id, reference: 'B01-' + id, buyerName: buyer, status, items: [{ name: 'Bowl' }], address: { city: 'Rabat' }, createdAt: '2026-11-01T10:00:00Z' },
    items: [{ productId: 'a', name: 'Bowl', price: 10, quantity: 2 }],
    sellerTotal: 20,
  }) as unknown as SellerOrderView;

describe('SellerOrdersComponent', () => {
  const setup = (views: SellerOrderView[], q: string | null = null) => {
    const advance = vi.fn((id: string) => of({ ...views.find((x) => x.order.id === id)!.order, status: 'CONFIRMED' }));
    TestBed.configureTestingModule({
      imports: [SellerOrdersComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: ProductService, useValue: { getProductsOwnedBy: () => of([{ id: 'a' }]) } },
        { provide: OrderService, useValue: { sellerOrders: () => of(views), advanceStatus: advance } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(q ? { q } : {}) }, queryParamMap: new BehaviorSubject(convertToParamMap(q ? { q } : {})) },
        },
      ],
    });
    vi.spyOn(TestBed.inject(AuthService), 'getStoredUser').mockReturnValue({ id: 's', name: 'S', email: 's@x', role: 'SELLER' });
    const fixture = TestBed.createComponent(SellerOrdersComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, advance };
  };

  const views = [v('1', 'PENDING', 'Amina'), v('2', 'PENDING', 'Lucas'), v('3', 'DELIVERED', 'Amina')];
  const count = (el: HTMLElement, status: string) => el.querySelector(`[data-status=${status}] .so-tab-count`)!.textContent!.trim();

  it('matchesOrder searches number, buyer and products', () => {
    expect(matchesOrder(views[0], 'b01-1')).toBe(true);
    expect(matchesOrder(views[0], 'amina')).toBe(true);
    expect(matchesOrder(views[0], 'bowl')).toBe(true);
    expect(matchesOrder(views[0], 'zzz')).toBe(false);
  });

  it('status tabs show counts and filter', async () => {
    const { fixture, el } = setup(views);
    expect(count(el, 'ALL')).toBe('3');
    expect(count(el, 'PENDING')).toBe('2');
    expect(count(el, 'DELIVERED')).toBe('1');
    el.querySelector<HTMLButtonElement>('[data-status=DELIVERED]')!.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('[data-testid=order-row]').length).toBe(1);
  });

  it('?q= from the topbar search pre-filters', () => {
    const { el } = setup(views, 'lucas');
    expect(el.querySelectorAll('[data-testid=order-row]').length).toBe(1);
    expect(count(el, 'ALL')).toBe('1');
  });

  it('advancing an order updates the row and the counts', async () => {
    const { fixture, el, advance } = setup(views);
    el.querySelector<HTMLButtonElement>('[data-testid=advance]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(advance).toHaveBeenCalledWith('1', ['a']);
    expect(count(el, 'PENDING')).toBe('1');
    expect(count(el, 'CONFIRMED')).toBe('1');
  });

  it('keeps the friendly empty state when there are no orders', () => {
    const { el } = setup([]);
    expect(el.textContent).toContain('No orders yet');
  });
});
