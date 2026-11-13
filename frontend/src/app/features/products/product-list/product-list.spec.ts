import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject, of } from 'rxjs';

import { ProductListComponent } from './product-list.component';
import { stockBadge } from '../../../shared/products/stock';
import { AuthService } from '../../auth/auth.service';
import { AuthUser } from '../../auth/auth.models';
import { MediaService } from '../../../shared/services/media-service';
import { Page, ProductResponse, ProductService, applySearch } from '../../../shared/services/product-service';
import { ProductSearchQuery } from '../../../core/models/commerce.models';

const product = (id: string, name: string, price: number, quantity: number, owner = false): ProductResponse => ({
  id,
  name,
  description: `${name} description`,
  price,
  quantity,
  owner,
});

const CATALOG = [
  product('1', 'Walnut bowl', 40, 12),
  product('2', 'Linen apron', 25, 3),
  product('3', 'Clay mug', 18, 0),
  product('4', 'Oak spoon', 9, 30),
];

describe('ProductListComponent', () => {
  let catalog: ProductResponse[];
  let pending: Subject<Page<ProductResponse>> | null;

  const setup = async (user: AuthUser | null = null, url = '/products') => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'products', component: ProductListComponent }]),
        {
          provide: ProductService,
          useValue: {
            // Real filtering logic over in-memory data.
            searchProducts: (q: ProductSearchQuery): Observable<Page<ProductResponse>> =>
              pending ?? of(applySearch(catalog, q)),
          },
        },
        {
          provide: MediaService,
          useValue: {
            getMediaByProduct: () => of([]),
            imageUrl: () => '',
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

  const text = (el: HTMLElement, selector: string) =>
    Array.from(el.querySelectorAll(selector)).map((n) => n.textContent!.replace(/\s+/g, ' ').trim());

  beforeEach(() => {
    catalog = [...CATALOG];
    pending = null;
  });

  it('shows skeleton cards while products load', async () => {
    pending = new Subject();
    const { el } = await setup();
    expect(el.querySelector('[data-testid="skeletons"]')).not.toBeNull();
    expect(el.querySelectorAll('.product-card.is-skeleton').length).toBe(8);
  });

  describe('role-aware hero actions', () => {
    it('guest: create account and sign in', async () => {
      const { el } = await setup(null);
      const actions = text(el, '[data-testid="hero-actions"] a, [data-testid="hero-actions"] button');
      expect(actions).toContain('Create account');
      expect(actions).toContain('Sign in');
      expect(actions.join()).not.toContain('Start selling');
    });

    it('client: browse the catalog', async () => {
      const { el } = await setup({ id: 'c', name: 'Cli', email: 'c@x.com', role: 'CLIENT' });
      const actions = text(el, '[data-testid="hero-actions"] a, [data-testid="hero-actions"] button');
      expect(actions).toEqual(['Browse the catalog']);
    });

    it('seller: add a product and go to dashboard, never "Start selling"', async () => {
      const { el } = await setup({ id: 's', name: 'Sel', email: 's@x.com', role: 'SELLER' });
      const actions = text(el, '[data-testid="hero-actions"] a');
      expect(actions).toEqual(['Add a product', 'Go to dashboard']);
      expect(el.textContent).not.toContain('Start selling');
    });
  });

  it('shows stock badges and a 4-up grid', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('.product-grid .product-card').length).toBe(4);
    const badges = text(el, '.stock-badge');
    expect(badges).toContain('Only 3 left');
    expect(badges).toContain('Out of stock');
    expect(badges.length).toBe(2);
  });

  it('stockBadge thresholds', () => {
    expect(stockBadge(0)).toEqual({ label: 'Out of stock', tone: 'out' });
    expect(stockBadge(5)).toEqual({ label: 'Only 5 left', tone: 'low' });
    expect(stockBadge(6)).toEqual({ label: 'In stock', tone: 'in' });
  });

  it('uses a wide feature layout for a single product', async () => {
    catalog = [CATALOG[0]];
    const { el } = await setup();
    expect(el.querySelector('.product-grid')!.classList).toContain('is-single');
    // Hero still looks full: one product plus two decorative plinths.
    expect(el.querySelectorAll('.hero-stack a.hero-card').length).toBe(1);
    expect(el.querySelectorAll('.hero-stack .hero-card.is-ghost').length).toBe(2);
  });

  it('shows the hero fallback when there are no products', async () => {
    catalog = [];
    const { el } = await setup();
    expect(el.querySelector('[data-testid="hero-empty"]')).not.toBeNull();
    expect(el.textContent).toContain('No products yet');
  });

  it('shows an empty state with "Clear filters" when filters match nothing', async () => {
    const { harness, el } = await setup(null, '/products?q=zzz');
    expect(el.querySelector('[data-testid="no-results"]')).not.toBeNull();

    el.querySelector<HTMLButtonElement>('[data-testid="no-results"] button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/products');
    expect(el.querySelectorAll('.product-grid .product-card').length).toBe(4);
  });

  describe('one search query shared by header and catalog', () => {
    const type = (input: HTMLInputElement, value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const settle = async (harness: RouterTestingHarness) => {
      await new Promise((resolve) => setTimeout(resolve, 350)); // past the 300ms debounce
      await harness.fixture.whenStable();
      harness.detectChanges();
    };

    it('typing in the header filters the catalog and fills the catalog box', async () => {
      const { harness, el } = await setup(null, '/products?stock=1');
      type(el.querySelector<HTMLInputElement>('#nav-search-input')!, 'bowl');
      await settle(harness);

      const url = TestBed.inject(Router).url;
      expect(url).toContain('q=bowl');
      expect(url).toContain('stock=1'); // other filters are kept
      expect(el.querySelector<HTMLInputElement>('#catalog-search')!.value).toBe('bowl');
      expect(text(el, '.product-grid h3')).toEqual(['Walnut bowl']);
    });

    it('typing in the catalog box updates the header box', async () => {
      const { harness, el } = await setup();
      type(el.querySelector<HTMLInputElement>('#catalog-search')!, 'mug');
      await settle(harness);

      expect(TestBed.inject(Router).url).toContain('q=mug');
      expect(el.querySelector<HTMLInputElement>('#nav-search-input')!.value).toBe('mug');
    });
  });
});
