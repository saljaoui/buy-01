import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { DashboardComponent, dailySeries, percentChange } from './dashboard.component';
import { UserService } from '../../core/services/user.service';
import { MediaService } from '../../shared/services/media-service';
import { OrderService, SellerOrderView } from '../../shared/services/order.service';
import { ProductResponse, ProductService } from '../../shared/services/product-service';
import { ConfirmService } from '../../shared/ui/confirm/confirm.service';
import { SellerShellService } from '../seller/seller-layout/seller-shell.service';

const DAY = 86_400_000;
const view = (daysAgo: number, total: number, status = 'DELIVERED'): SellerOrderView =>
  ({
    order: { id: 'o' + daysAgo + total, reference: 'B01-' + daysAgo, buyerName: 'Amina', status, createdAt: new Date(Date.now() - daysAgo * DAY).toISOString() },
    items: [],
    sellerTotal: total,
  }) as unknown as SellerOrderView;

describe('DashboardComponent', () => {
  let deleteProduct: ReturnType<typeof vi.fn>;

  const setup = (products: ProductResponse[], media: Record<string, number> = {}, orders: SellerOrderView[] = []) => {
    const owned = vi.fn(() => of(products));
    deleteProduct = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: UserService, useValue: { getCurrentUser: () => of({ id: 'seller-1', name: 'Ada Lovelace', email: 's@x.com', role: 'SELLER', avatar: null }) } },
        { provide: ProductService, useValue: { getProductsOwnedBy: owned, deleteProduct } },
        { provide: MediaService, useValue: { getMediaByProduct: (id: string) => of(Array.from({ length: media[id] ?? 0 }, (_, i) => ({ id: id + i, imageUrl: '/m' }))), imageUrl: () => 'http://x/m' } },
        { provide: OrderService, useValue: { sellerOrders: () => of(orders) } },
      ],
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, owned };
  };

  const products: ProductResponse[] = [
    { id: 'a', name: 'Bowl', description: 'A wooden bowl', price: 10, quantity: 3, owner: true },
    { id: 'b', name: 'Mug', description: 'A clay mug', price: 8, quantity: 0, owner: true },
  ];

  it('dailySeries / percentChange', () => {
    const views = [view(0, 10), view(0, 5), view(2, 7), view(1, 99, 'CANCELLED'), view(20, 3)];
    expect(dailySeries(views, 3, (v) => v.sellerTotal)).toEqual([7, 0, 15]);
    expect(percentChange(30, 20)).toBe(50);
    expect(percentChange(5, 0)).toBeNull();
  });

  it('asks for the products of the seller returned by /users/me', () => {
    const { owned } = setup([]);
    expect(owned).toHaveBeenCalledWith('seller-1');
  });

  it('empty store: onboarding hero instead of zeros, steps ticking from data', () => {
    const { el } = setup([]);
    const hero = el.querySelector('[data-testid=onboarding]')!;
    expect(hero.textContent).toContain("Let's set up your store");
    expect(el.querySelector('app-stat-card')).toBeNull();
    expect(hero.querySelectorAll('.ob-step.done').length).toBe(0);
    expect(hero.querySelector('a')!.getAttribute('href')).toBe('/seller/products/new');
    // No duplicate "New product" in the header while the hero offers it.
    expect(el.querySelector('app-page-header a')).toBeNull();
  });

  it('with products: 4 stat cards with clear badges, setup strip, products table', () => {
    const { el } = setup(products, { a: 1 }, [view(1, 24, 'PENDING')]);
    const cards = el.querySelectorAll('app-stat-card');
    expect(cards.length).toBe(4);
    const badges = Array.from(el.querySelectorAll('.sc-badge')).map((b) => b.textContent!.trim());
    expect(badges).toEqual(['Last 14 days', '1 need you', '1 out of stock', '1 need photos']);
    // All three onboarding steps are done (product, photo, order) → no strip.
    expect(el.querySelector('[data-testid=setup-strip]')).toBeNull();
    expect(el.querySelectorAll('.product-table tbody tr').length).toBe(2);
    expect(TestBed.inject(SellerShellService).productCount()).toBe(2);
  });

  it('shows the setup strip until every step is done', () => {
    const { el } = setup(products, {}, []);
    const strip = el.querySelector('[data-testid=setup-strip]')!;
    expect(strip.textContent).toContain('1 of 3 done');
  });

  it('delete asks for confirmation first', async () => {
    const { fixture, el } = setup(products, { a: 1 });
    const confirm = TestBed.inject(ConfirmService);
    const ask = vi.spyOn(confirm, 'ask').mockResolvedValue(false);
    el.querySelector<HTMLButtonElement>('.row-btn.danger')!.click();
    await fixture.whenStable();
    expect(ask).toHaveBeenCalled();
    expect(deleteProduct).not.toHaveBeenCalled();

    ask.mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('.row-btn.danger')!.click();
    await fixture.whenStable();
    expect(deleteProduct).toHaveBeenCalledWith('a');
  });
});
