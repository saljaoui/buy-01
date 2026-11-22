import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';

import { CartPageComponent } from './cart-page.component';
import { AuthService } from '../../auth/auth.service';
import { CartService } from '../../../shared/services/cart.service';

describe('CartPageComponent', () => {
  const lamp = { productId: 'p1', name: 'Lamp', price: 10, stock: 3, imageUrl: null };
  let cart: CartService;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [CartPageComponent], providers: [provideRouter([]), provideHttpClient()] });
    cart = TestBed.inject(CartService);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('shows "Your cart is empty" when there is nothing in the cart', () => {
    const fixture = TestBed.createComponent(CartPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Your cart is empty');
  });

  it('lists the items with their total price', () => {
    cart.add(lamp, 2);

    const fixture = TestBed.createComponent(CartPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.cart-line').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.line-total').textContent).toContain('$20.00');
  });

  it('increases the quantity with the "+" button', () => {
    cart.add(lamp, 1);
    const fixture = TestBed.createComponent(CartPageComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[aria-label="Increase quantity"]').click();

    expect(cart.quantityOf('p1')).toBe(2);
  });

  it('removes an item and shows the undo bar', () => {
    cart.add(lamp, 1);
    const fixture = TestBed.createComponent(CartPageComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.link-btn').click();
    fixture.detectChanges();

    expect(cart.isEmpty()).toBe(true);
    expect(fixture.nativeElement.querySelector('.undo-bar').textContent).toContain('Removed');
  });

  it('puts the item back when the user clicks "Undo"', () => {
    cart.add(lamp, 1);
    const fixture = TestBed.createComponent(CartPageComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.link-btn').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.undo-bar button').click();

    expect(cart.quantityOf('p1')).toBe(1);
  });

  it('sends a guest to /login with returnUrl=/checkout', () => {
    cart.add(lamp, 1);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);
    const fixture = TestBed.createComponent(CartPageComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.checkout-btn').click();

    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/checkout' } });
  });

  it('sends a logged-in client to /checkout', () => {
    cart.add(lamp, 1);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    const fixture = TestBed.createComponent(CartPageComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.checkout-btn').click();

    expect(router.navigate).toHaveBeenCalledWith(['/checkout']);
  });

  it('hides the checkout button for a seller', () => {
    cart.add(lamp, 1);
    vi.spyOn(auth, 'getStoredUser').mockReturnValue({ id: 's', name: 'Shop', email: 's@x.com', role: 'SELLER' });

    const fixture = TestBed.createComponent(CartPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.checkout-btn')).toBeNull();
    expect(fixture.nativeElement.querySelector('.seller-note').textContent).toContain("can't place orders");
  });
});
