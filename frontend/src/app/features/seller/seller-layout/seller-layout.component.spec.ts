import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';

import { SellerLayoutComponent, activeItemFor, crumbFor } from './seller-layout.component';
import { SellerShellService } from './seller-shell.service';
import { AuthService } from '../../auth/auth.service';
import { MediaService } from '../../../shared/services/media-service';
import { OrderService } from '../../../shared/services/order.service';
import { ProductService } from '../../../shared/services/product-service';

@Component({ template: '<main class="seller-body">Page A</main>' })
class PageA {}

@Component({ template: '<main class="seller-body">Page B</main>' })
class PageB {}

@Component({ template: 'login' })
class LoginPage {}

const PRODUCTS = [
  { id: '1', name: 'Walnut bowl', description: 'A bowl', price: 30, quantity: 4, owner: true },
  { id: '2', name: 'Linen apron', description: 'An apron', price: 20, quantity: 0, owner: true },
];

const order = (id: string, status: string, ref: string, buyer: string) => ({
  order: { id, reference: ref, buyerName: buyer, status, items: [], createdAt: new Date().toISOString() },
  items: [],
  sellerTotal: 10,
});

describe('SellerLayoutComponent', () => {
  let mediaCount: number;
  let orders: ReturnType<typeof order>[];

  const setup = async (url = '/seller') => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'seller', component: SellerLayoutComponent, children: [{ path: '', component: PageA }, { path: 'media', component: PageB }, { path: 'orders', component: PageB }] },
          { path: 'login', component: LoginPage },
        ]),
        { provide: ProductService, useValue: { getProductsOwnedBy: () => of(PRODUCTS) } },
        { provide: MediaService, useValue: { getMediaByProduct: () => of(Array.from({ length: mediaCount }, (_, i) => ({ id: 'm' + i }))) } },
        { provide: OrderService, useValue: { sellerOrders: () => of(orders) } },
      ],
    });
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'getStoredUser').mockReturnValue({ id: 's1', name: 'Ada Lovelace', email: 'ada@x.com', role: 'SELLER' });
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return { harness, el: harness.fixture.nativeElement as HTMLElement, auth };
  };

  const settle = async (harness: RouterTestingHarness) => {
    await harness.fixture.whenStable();
    harness.detectChanges();
  };

  const badge = (el: HTMLElement, label: string) =>
    Array.from(el.querySelectorAll('.seller-nav-link'))
      .find((a) => a.textContent!.includes(label))!
      .querySelector('.seller-nav-badge');

  beforeEach(() => {
    mediaCount = 1;
    orders = [order('o1', 'PENDING', 'B01-AAA', 'Amina'), order('o2', 'DELIVERED', 'B01-BBB', 'Lucas')];
  });

  it('renders the sidebar once, a slim topbar, and the page inside one container', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('.seller-sidebar').length).toBe(1);
    expect(el.querySelector('.seller-topbar .seller-container')).not.toBeNull();
    expect(el.querySelector('.seller-page .seller-body')!.textContent).toContain('Page A');
    expect(el.querySelector('[data-testid=crumb]')!.textContent).toContain('Dashboard');
  });

  it('nav has no "Create product"; active item follows the URL', async () => {
    const { harness, el } = await setup();
    const labels = Array.from(el.querySelectorAll('.seller-nav-link .nav-text')).map((n) => n.textContent!.trim());
    expect(labels).toEqual(['Dashboard', 'Products', 'Media library', 'Orders', 'Profile']);
    expect(el.querySelector('.seller-nav-link.active')!.textContent).toContain('Dashboard');

    await harness.navigateByUrl('/seller/media');
    await settle(harness);
    expect(el.querySelector('.seller-nav-link.active')!.textContent).toContain('Media library');
    expect(el.querySelector('[data-testid=crumb]')!.textContent).toContain('Media library');
  });

  it('shows real counts on the badges, and hides them at 0', async () => {
    mediaCount = 0;
    const { el } = await setup();
    expect(badge(el, 'Products')!.textContent!.trim()).toBe('2');
    expect(badge(el, 'Orders')!.textContent!.trim()).toBe('1'); // only the PENDING one needs action
    expect(badge(el, 'Media library')).toBeNull();
    expect(el.querySelector('[data-testid=orders-indicator] .topbar-dot')!.textContent!.trim()).toBe('1');
  });

  it('collapses to an icon rail and remembers it', async () => {
    const { harness, el } = await setup();
    el.querySelector<HTMLButtonElement>('[data-testid=rail-toggle]')!.click();
    await settle(harness);
    expect(el.querySelector('.seller-shell')!.classList).toContain('is-rail');
    expect(localStorage.getItem('buy01.seller.rail')).toBe('1');
  });

  it('user card opens a menu with Profile / View store / Sign out', async () => {
    const { harness, el, auth } = await setup();
    const clear = vi.spyOn(auth, 'clearSession');
    expect(el.querySelector('.seller-role-badge')!.textContent).toContain('Seller');
    el.querySelector<HTMLButtonElement>('[data-testid=account-trigger]')!.click();
    await settle(harness);
    const menu = el.querySelector('[data-testid=account-menu]')!;
    expect(Array.from(menu.querySelectorAll('a, button')).map((n) => n.textContent!.trim())).toEqual([
      'Profile',
      'View store',
      'Sign out',
    ]);
    menu.querySelector<HTMLButtonElement>('button')!.click();
    await settle(harness);
    expect(clear).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('menu button opens the mobile drawer; backdrop and Escape close it', async () => {
    const { harness, el } = await setup();
    const btn = el.querySelector<HTMLButtonElement>('[data-testid=seller-menu-btn]')!;
    const shell = el.querySelector('.seller-shell')!;
    btn.click();
    await settle(harness);
    expect(shell.classList).toContain('menu-open');
    el.querySelector<HTMLButtonElement>('.seller-backdrop')!.click();
    await settle(harness);
    expect(shell.classList).not.toContain('menu-open');
    btn.click();
    await settle(harness);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle(harness);
    expect(shell.classList).not.toContain('menu-open');
  });

  it('global search finds products and orders, and opens an order in Orders', async () => {
    const { harness, el } = await setup();
    const input = el.querySelector<HTMLInputElement>('#seller-search-input')!;
    input.value = 'b01-aaa';
    input.dispatchEvent(new Event('input'));
    await settle(harness);
    const options = Array.from(el.querySelectorAll('[role=option]')).map((o) => o.textContent!.trim());
    expect(options.some((t) => t.includes('B01-AAA'))).toBe(true);

    input.value = 'walnut';
    input.dispatchEvent(new Event('input'));
    await settle(harness);
    expect(el.querySelector('[role=option]')!.textContent).toContain('Walnut bowl');

    input.value = 'amina';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settle(harness);
    expect(TestBed.inject(Router).url).toBe('/seller/orders?q=B01-AAA');
  });

  it('maps URLs to nav items and breadcrumbs', () => {
    expect(activeItemFor('/seller')).toBe('dashboard');
    expect(activeItemFor('/seller#products')).toBe('products');
    expect(activeItemFor('/seller/products/new')).toBe('products');
    expect(activeItemFor('/seller/media?x=1')).toBe('media');
    expect(activeItemFor('/seller/orders')).toBe('orders');
    expect(activeItemFor('/seller/profile')).toBe('profile');
    expect(crumbFor('/seller/products/new')).toBe('New product');
    expect(crumbFor('/seller/products/abc/edit')).toBe('Edit product');
  });

  it('shell service: setProducts / reset', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    const shell = TestBed.inject(SellerShellService);
    shell.setProducts(PRODUCTS, { '1': 2, '2': 1 });
    expect(shell.productCount()).toBe(2);
    expect(shell.mediaCount()).toBe(3);
    shell.reset();
    expect(shell.productCount()).toBe(0);
  });
});
