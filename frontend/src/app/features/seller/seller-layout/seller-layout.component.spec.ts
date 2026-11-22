import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { SellerLayoutComponent, activeItemFor, crumbFor } from './seller-layout.component';
import { AuthService } from '../../auth/auth.service';
import { MediaService } from '../../../shared/services/media-service';
import { OrderService } from '../../../shared/services/order.service';
import { ProductService } from '../../../shared/services/product-service';

describe('SellerLayoutComponent', () => {
  const bowl = { id: '1', name: 'Walnut bowl', description: 'A bowl', price: 30, quantity: 4, owner: true };
  const apron = { id: '2', name: 'Linen apron', description: 'An apron', price: 20, quantity: 0, owner: true };
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [SellerLayoutComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: ProductService, useValue: { getProductsOwnedBy: () => of([bowl, apron]) } },
        { provide: MediaService, useValue: { getMediaByProduct: () => of([]) } },
        { provide: OrderService, useValue: { sellerOrders: () => of([]) } },
      ],
    });
    auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'getStoredUser').mockReturnValue({ id: 's1', name: 'Ada Lovelace', email: 'ada@x.com', role: 'SELLER' });
  });

  it('activeItemFor picks the menu item that matches the URL', () => {
    expect(activeItemFor('/seller')).toBe('dashboard');
    expect(activeItemFor('/seller/products/new')).toBe('products');
    expect(activeItemFor('/seller/media')).toBe('media');
    expect(activeItemFor('/seller/orders?q=abc')).toBe('orders');
  });

  it('crumbFor gives the page name for the breadcrumb', () => {
    expect(crumbFor('/seller/products/new')).toBe('New product');
    expect(crumbFor('/seller/products/abc/edit')).toBe('Edit product');
    expect(crumbFor('/seller')).toBe('Dashboard');
  });

  it('shows the 5 seller pages in the side menu', () => {
    const fixture = TestBed.createComponent(SellerLayoutComponent);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.seller-nav-link .nav-text');
    expect(Array.from(links, (l: Element) => l.textContent!.trim())).toEqual(['Dashboard', 'Products', 'Media library', 'Orders', 'Profile']);
  });

  it('shows the number of products next to "Products"', () => {
    const fixture = TestBed.createComponent(SellerLayoutComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.seller-nav-badge').textContent.trim()).toBe('2');
  });

  it('signs out and goes to /login', () => {
    const clearSession = vi.spyOn(auth, 'clearSession');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(SellerLayoutComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid=account-trigger]').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid=account-menu] button').click();

    expect(clearSession).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('remembers the collapsed sidebar in localStorage', () => {
    const fixture = TestBed.createComponent(SellerLayoutComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid=rail-toggle]').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.seller-shell').classList).toContain('is-rail');
    expect(localStorage.getItem('buy01.seller.rail')).toBe('1');
  });
});
