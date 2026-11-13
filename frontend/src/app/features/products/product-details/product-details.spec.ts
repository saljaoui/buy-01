import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject, of, throwError } from 'rxjs';

import { ProductDetailsComponent } from './product-details.component';
import { AuthService } from '../../auth/auth.service';
import { AuthUser } from '../../auth/auth.models';
import { CartService } from '../../../shared/services/cart.service';
import { Media, MediaService } from '../../../shared/services/media-service';
import { ProductResponse, ProductService, applySearch } from '../../../shared/services/product-service';
import { ToastService } from '../../../shared/services/toast-service';

@Component({ template: 'login page' })
class LoginStubComponent {}

const make = (id: string, quantity: number, owner = false): ProductResponse => ({
  id,
  name: `Product ${id} with a fairly long descriptive name`,
  description: 'Made by hand.',
  price: 20,
  quantity,
  owner,
});

const CLIENT: AuthUser = { id: 'c', name: 'Cli', email: 'c@x.com', role: 'CLIENT' };
const SELLER: AuthUser = { id: 's', name: 'Sel', email: 's@x.com', role: 'SELLER' };

describe('ProductDetailsComponent', () => {
  let products: Record<string, ProductResponse>;
  let media: Record<string, Media[]>;
  let getProduct: ReturnType<typeof vi.fn<(id: string) => Observable<ProductResponse>>>;
  /** When set, loading the product never answers (to see the skeleton). */
  let pendingProduct: Subject<ProductResponse> | null;

  const photos = (id: string, n: number): Media[] =>
    Array.from({ length: n }, (_, i) => ({ id: `${id}-m${i}`, productId: id, imageUrl: `/media/${id}-${i}.jpg` }));

  const setup = async (user: AuthUser | null = CLIENT, url = '/products/1') => {
    getProduct = vi.fn((id: string): Observable<ProductResponse> =>
      pendingProduct ??
      (products[id]
        ? of(products[id])
        : throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'Product not found' } }))),
    );
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'products/:id', component: ProductDetailsComponent },
          { path: 'login', component: LoginStubComponent },
        ]),
        {
          provide: ProductService,
          useValue: {
            getProduct: (id: string) => getProduct(id),
            searchProducts: (q: Parameters<typeof applySearch>[1]) => of(applySearch(Object.values(products), q)),
            deleteProduct: () => of(undefined),
          },
        },
        {
          provide: MediaService,
          useValue: {
            getMediaByProduct: (id: string) => of(media[id] ?? []),
            imageUrl: (m: Media) => `http://api.test${m.imageUrl}`,
          },
        },
      ],
    });
    vi.spyOn(TestBed.inject(AuthService), 'getAuthenticatedUser').mockReturnValue(user);
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return { harness, el: harness.routeNativeElement as HTMLElement };
  };

  const q = <T extends Element = HTMLElement>(el: Element, selector: string): T | null => el.querySelector<T>(selector);
  const refresh = async (harness: RouterTestingHarness) => {
    await harness.fixture.whenStable();
    harness.detectChanges();
  };

  beforeEach(() => {
    localStorage.clear();
    pendingProduct = null;
    products = { '1': make('1', 12), '2': make('2', 8), '3': make('3', 2) };
    media = { '1': photos('1', 1) };
  });

  it('shows a whole-page skeleton while the product loads', async () => {
    pendingProduct = new Subject<ProductResponse>();
    const { el } = await setup();
    expect(q(el, '[data-testid="page-skeleton"]')).not.toBeNull();
    expect(q(el, '.detail-title')).toBeNull();
  });

  it('shows "Product not found" with a way back for an unknown id', async () => {
    const { el } = await setup(CLIENT, '/products/nope');
    const state = q(el, '[data-testid="not-found"]')!;
    expect(state.textContent).toContain('Product not found');
    expect(q<HTMLAnchorElement>(state, 'a')!.getAttribute('href')).toBe('/products');
  });

  it('renders the full name in the title (no truncation)', async () => {
    const { el } = await setup();
    expect(q(el, '#product-title')!.textContent!.trim()).toBe(products['1'].name);
  });

  describe('gallery', () => {
    it('hides the thumbnail strip with a single photo', async () => {
      const { el } = await setup();
      expect(q(el, '.gallery-stage img')).not.toBeNull();
      expect(q(el, '.thumb-strip')).toBeNull();
      expect(q(el, '.stage-arrow')).toBeNull();
    });

    it('with several photos: thumbnails with an active state, and arrow keys move', async () => {
      media['1'] = photos('1', 3);
      const { harness, el } = await setup();
      const thumbs = el.querySelectorAll<HTMLButtonElement>('.thumb-btn');
      expect(thumbs.length).toBe(3);
      expect(thumbs[0].getAttribute('aria-current')).toBe('true');

      thumbs[2].click();
      await refresh(harness);
      expect(thumbs[2].classList).toContain('active');
      expect(q(el, '.stage-count')!.textContent).toContain('3 / 3');

      thumbs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await refresh(harness);
      expect(thumbs[0].classList).toContain('active'); // wraps around
      expect(q<HTMLImageElement>(el, '.gallery-stage img')!.alt).toContain('photo 1 of 3');
    });

    it('covers the stage with a skeleton until the photo has loaded', async () => {
      const { harness, el } = await setup();
      expect(q(el, '[data-testid="image-skeleton"]')).not.toBeNull();
      q(el, '.gallery-stage img')!.dispatchEvent(new Event('load'));
      await refresh(harness);
      expect(q(el, '[data-testid="image-skeleton"]')).toBeNull();
    });
  });

  describe('stock and quantity', () => {
    const badge = (el: HTMLElement) => q(el, '[data-testid="stock-badge"]')!;
    const addBtn = (el: HTMLElement) => q<HTMLButtonElement>(el, '[data-testid="add-to-cart"]')!;

    it('in stock', async () => {
      const { el } = await setup();
      expect(badge(el).textContent).toContain('In stock');
      expect(badge(el).classList).toContain('is-in');
    });

    it('low stock: "Only N left" and the stepper stops at the stock', async () => {
      products['1'] = make('1', 2);
      const { harness, el } = await setup();
      expect(badge(el).textContent).toContain('Only 2 left');
      expect(badge(el).classList).toContain('is-low');

      const minus = q<HTMLButtonElement>(el, '[data-testid="qty-minus"]')!;
      const plus = q<HTMLButtonElement>(el, '[data-testid="qty-plus"]')!;
      expect(minus.disabled).toBe(true);
      plus.click();
      await refresh(harness);
      expect(q(el, '[data-testid="qty"]')!.textContent!.trim()).toBe('2');
      expect(plus.disabled).toBe(true);
      expect(minus.disabled).toBe(false);
    });

    it('out of stock: Add to cart disabled', async () => {
      products['1'] = make('1', 0);
      const { el } = await setup();
      expect(badge(el).textContent).toContain('Out of stock');
      expect(addBtn(el).disabled).toBe(true);
      expect(addBtn(el).textContent).toContain('Out of stock');
    });
  });

  describe('add to cart', () => {
    it('shows a loading state, then adds, toasts with "View cart" and bumps the cart badge', async () => {
      const { harness, el } = await setup();
      const pending = new Subject<ProductResponse>();
      getProduct.mockReturnValueOnce(pending);

      q<HTMLButtonElement>(el, '[data-testid="add-to-cart"]')!.click();
      await refresh(harness);
      const button = q<HTMLButtonElement>(el, '[data-testid="add-to-cart"]')!;
      expect(button.disabled).toBe(true);
      expect(button.textContent).toContain('Adding');

      pending.next(products['1']);
      pending.complete();
      await refresh(harness);

      expect(button.disabled).toBe(false);
      expect(button.textContent).toContain('Add to cart');
      expect(TestBed.inject(CartService).count()).toBe(1);
      const toast = TestBed.inject(ToastService).toasts().at(-1)!;
      expect(toast.type).toBe('success');
      expect(toast.message).toContain('Added to cart');
      expect(toast.action).toEqual({ label: 'View cart', link: '/cart' });
      expect(q(el, '.cart-badge')!.textContent!.trim()).toBe('1');
      expect(q(el, '.cart-badge')!.classList).toContain('bump');
    });

    it('shows the server message on failure and re-enables the button', async () => {
      const { harness, el } = await setup();
      getProduct.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Not enough stock' } })),
      );
      q<HTMLButtonElement>(el, '[data-testid="add-to-cart"]')!.click();
      await refresh(harness);

      expect(TestBed.inject(ToastService).toasts().at(-1)!.message).toBe('Not enough stock');
      expect(q<HTMLButtonElement>(el, '[data-testid="add-to-cart"]')!.disabled).toBe(false);
      expect(TestBed.inject(CartService).count()).toBe(0);
    });

    it('lowers the quantity when the fresh stock is smaller than asked', async () => {
      const { harness, el } = await setup();
      for (let i = 0; i < 4; i++) q<HTMLButtonElement>(el, '[data-testid="qty-plus"]')!.click();
      getProduct.mockReturnValueOnce(of(make('1', 3)));
      q<HTMLButtonElement>(el, '[data-testid="add-to-cart"]')!.click();
      await refresh(harness);

      expect(TestBed.inject(CartService).count()).toBe(0);
      expect(q(el, '[data-testid="qty"]')!.textContent!.trim()).toBe('3');
      expect(TestBed.inject(ToastService).toasts().at(-1)!.message).toContain('Only 3 more available');
    });

    it('sends a guest to login and back to this page', async () => {
      const { harness, el } = await setup(null);
      q<HTMLButtonElement>(el, '[data-testid="add-to-cart"]')!.click();
      await refresh(harness);
      expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fproducts%2F1');
      expect(TestBed.inject(CartService).count()).toBe(0);
    });
  });

  describe('roles', () => {
    it('owner sees Edit product / Manage in dashboard instead of Add to cart', async () => {
      products['1'] = make('1', 12, true);
      const { el } = await setup(SELLER);
      const panel = q(el, '[data-testid="owner-panel"]')!;
      const links = Array.from(panel.querySelectorAll('a')).map((a) => [a.textContent!.trim(), a.getAttribute('href')]);
      expect(links).toEqual([
        ['Edit product', '/seller/products/1/edit'],
        ['Manage in dashboard', '/seller'],
      ]);
      expect(q(el, '[data-testid="add-to-cart"]')).toBeNull();
      expect(q(el, '[data-testid="buy-bar"]')).toBeNull();
    });

    it("a seller viewing someone else's product can't buy", async () => {
      const { el } = await setup(SELLER);
      expect(q(el, '[data-testid="seller-note"]')).not.toBeNull();
      expect(q(el, '[data-testid="add-to-cart"]')).toBeNull();
    });

    it('client gets the mobile buy bar', async () => {
      const { el } = await setup();
      expect(q(el, '[data-testid="buy-bar"]')!.textContent).toContain('$20.00');
    });
  });

  describe('you might also like', () => {
    it('lists other products, not the current one', async () => {
      const { el } = await setup();
      const titles = Array.from(el.querySelectorAll('[data-testid="related"] app-product-card h3')).map((h) =>
        h.textContent!.trim(),
      );
      expect(titles).toEqual([products['2'].name, products['3'].name]);
    });

    it('is hidden when there is nothing else', async () => {
      products = { '1': make('1', 12) };
      const { el } = await setup();
      expect(q(el, '[data-testid="related"]')).toBeNull();
    });
  });
});
