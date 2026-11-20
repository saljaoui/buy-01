import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER, of } from 'rxjs';

import { ProductListComponent } from './product-list.component';
import { stockBadge } from '../../../shared/products/stock';
import { AuthService } from '../../auth/auth.service';
import { MediaService } from '../../../shared/services/media-service';
import { ProductService } from '../../../shared/services/product-service';

describe('ProductListComponent', () => {
  const bowl = { id: '1', name: 'Walnut bowl', description: 'A bowl', price: 40, quantity: 12, owner: false };
  const apron = { id: '2', name: 'Linen apron', description: 'An apron', price: 25, quantity: 3, owner: false };
  const mug = { id: '3', name: 'Clay mug', description: 'A mug', price: 18, quantity: 0, owner: false };
  const productService = { searchProducts: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'products', component: ProductListComponent }]),
        { provide: ProductService, useValue: productService },
        { provide: MediaService, useValue: { getMediaByProduct: () => of([]), imageUrl: () => '' } },
      ],
    });
  });

  it('shows skeleton cards while products load', async () => {
    productService.searchProducts.mockReturnValue(NEVER);

    const harness = await RouterTestingHarness.create('/products');
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('[data-testid="skeletons"]')).not.toBeNull();
  });

  it('shows one card per product', async () => {
    productService.searchProducts.mockReturnValue(of({ content: [bowl, apron, mug], totalElements: 3, totalPages: 1 }));

    const harness = await RouterTestingHarness.create('/products');
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelectorAll('.product-grid .product-card').length).toBe(3);
  });

  it('shows stock badges for low and sold-out products', async () => {
    productService.searchProducts.mockReturnValue(of({ content: [bowl, apron, mug], totalElements: 3, totalPages: 1 }));

    const harness = await RouterTestingHarness.create('/products');
    harness.detectChanges();

    const text = harness.routeNativeElement!.textContent;
    expect(text).toContain('Only 3 left');
    expect(text).toContain('Out of stock');
  });

  it('shows "No products yet" when there are no products', async () => {
    productService.searchProducts.mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0 }));

    const harness = await RouterTestingHarness.create('/products');
    harness.detectChanges();

    expect(harness.routeNativeElement!.textContent).toContain('No products yet');
  });

  it('shows the no-results state when the search matches nothing', async () => {
    productService.searchProducts.mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0 }));

    const harness = await RouterTestingHarness.create('/products?q=zzz');
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('[data-testid="no-results"]')).not.toBeNull();
  });

  it('shows seller actions to a seller', async () => {
    productService.searchProducts.mockReturnValue(of({ content: [bowl], totalElements: 1, totalPages: 1 }));
    vi.spyOn(TestBed.inject(AuthService), 'getAuthenticatedUser').mockReturnValue({ id: 's', name: 'S', email: 's@x.com', role: 'SELLER' });

    const harness = await RouterTestingHarness.create('/products');
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('[data-testid="hero-actions"]')!.textContent).toContain('Add a product');
  });

  it('stockBadge picks the right label for the stock', () => {
    expect(stockBadge(0).label).toBe('Out of stock');
    expect(stockBadge(5).label).toBe('Only 5 left');
    expect(stockBadge(6).label).toBe('In stock');
  });
});
