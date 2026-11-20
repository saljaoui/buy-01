import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { ProductDetailsComponent } from './product-details.component';
import { AuthService } from '../../auth/auth.service';
import { CartService } from '../../../shared/services/cart.service';
import { MediaService } from '../../../shared/services/media-service';
import { ProductService } from '../../../shared/services/product-service';
import { ToastService } from '../../../shared/services/toast-service';

describe('ProductDetailsComponent', () => {
  const lamp = { id: '1', name: 'Walnut lamp', description: 'Made by hand.', price: 20, quantity: 12, owner: false };
  const client = { id: 'c', name: 'Amina', email: 'c@x.com', role: 'CLIENT' as const };
  const seller = { id: 's', name: 'Shop', email: 's@x.com', role: 'SELLER' as const };
  const productService = { getProduct: vi.fn(), searchProducts: vi.fn(), deleteProduct: vi.fn() };
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    productService.searchProducts.mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0 }));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'products/:id', component: ProductDetailsComponent },
          { path: 'login', children: [] },
        ]),
        { provide: ProductService, useValue: productService },
        { provide: MediaService, useValue: { getMediaByProduct: () => of([]), imageUrl: () => '' } },
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  it('shows "Product not found" when the product does not exist', async () => {
    productService.getProduct.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    const harness = await RouterTestingHarness.create('/products/nope');
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('[data-testid="not-found"]')!.textContent).toContain('Product not found');
  });

  it('shows the product name in the title', async () => {
    productService.getProduct.mockReturnValue(of(lamp));

    const harness = await RouterTestingHarness.create('/products/1');
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('#product-title')!.textContent).toContain('Walnut lamp');
  });

  it('shows "Only 2 left" when the stock is low', async () => {
    productService.getProduct.mockReturnValue(of({ ...lamp, quantity: 2 }));

    const harness = await RouterTestingHarness.create('/products/1');
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('[data-testid="stock-badge"]')!.textContent).toContain('Only 2 left');
  });

  it('disables "Add to cart" when the product is out of stock', async () => {
    vi.spyOn(auth, 'getAuthenticatedUser').mockReturnValue(client);
    productService.getProduct.mockReturnValue(of({ ...lamp, quantity: 0 }));

    const harness = await RouterTestingHarness.create('/products/1');
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector<HTMLButtonElement>('[data-testid="add-to-cart"]')!.disabled).toBe(true);
  });

  it('adds the product to the cart when a client clicks "Add to cart"', async () => {
    vi.spyOn(auth, 'getAuthenticatedUser').mockReturnValue(client);
    productService.getProduct.mockReturnValue(of(lamp));
    const harness = await RouterTestingHarness.create('/products/1');
    harness.detectChanges();

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('[data-testid="add-to-cart"]')!.click();

    expect(TestBed.inject(CartService).count()).toBe(1);
    expect(TestBed.inject(ToastService).toasts().at(-1)!.message).toContain('Added to cart');
  });

  it('shows the server message and adds nothing when adding fails', async () => {
    vi.spyOn(auth, 'getAuthenticatedUser').mockReturnValue(client);
    const error = new HttpErrorResponse({ status: 409, error: { message: 'Not enough stock' } });
    productService.getProduct.mockReturnValueOnce(of(lamp)).mockReturnValueOnce(throwError(() => error));
    const harness = await RouterTestingHarness.create('/products/1');
    harness.detectChanges();

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('[data-testid="add-to-cart"]')!.click();

    expect(TestBed.inject(ToastService).toasts().at(-1)!.message).toBe('Not enough stock');
    expect(TestBed.inject(CartService).count()).toBe(0);
  });

  it('sends a guest to the login page when they click "Add to cart"', async () => {
    vi.spyOn(auth, 'getAuthenticatedUser').mockReturnValue(null);
    productService.getProduct.mockReturnValue(of(lamp));
    const harness = await RouterTestingHarness.create('/products/1');
    harness.detectChanges();

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('[data-testid="add-to-cart"]')!.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fproducts%2F1');
  });

  it('shows "Edit product" instead of "Add to cart" to the owner', async () => {
    vi.spyOn(auth, 'getAuthenticatedUser').mockReturnValue(seller);
    productService.getProduct.mockReturnValue(of({ ...lamp, owner: true }));

    const harness = await RouterTestingHarness.create('/products/1');
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('[data-testid="owner-panel"]')!.textContent).toContain('Edit product');
    expect(harness.routeNativeElement!.querySelector('[data-testid="add-to-cart"]')).toBeNull();
  });
});
