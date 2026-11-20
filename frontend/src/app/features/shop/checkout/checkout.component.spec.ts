import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CheckoutComponent } from './checkout.component';
import { CartService } from '../../../shared/services/cart.service';
import { OrderService } from '../../../shared/services/order.service';

describe('CheckoutComponent', () => {
  let fixture: ComponentFixture<CheckoutComponent>;
  let el: HTMLElement;
  let cart: CartService;
  let router: Router;
  const orderService = { placeOrder: vi.fn() };

  const validAddress = {
    fullName: 'Amina Alaoui',
    phone: '0612345678',
    street: '1 Rue Hassan',
    city: 'Rabat',
    postalCode: '10000',
  };

  beforeEach(() => {
    localStorage.clear();
    orderService.placeOrder.mockReset();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [provideRouter([]), provideHttpClient(), { provide: OrderService, useValue: orderService }],
    });
    cart = TestBed.inject(CartService);
    cart.add({ productId: 'p1', name: 'Lamp', price: 20, stock: 5, imageUrl: null }, 2);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(CheckoutComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  function clickMainButton() {
    el.querySelector<HTMLButtonElement>('.checkout-btn')!.click();
    fixture.detectChanges();
  }

  it('redirects to /cart when the cart is empty', () => {
    cart.clear();

    TestBed.createComponent(CheckoutComponent).detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/cart']);
  });

  it('stays on step 1 when the address is empty', () => {
    fixture.componentInstance.form.patchValue({ fullName: '' });

    clickMainButton();

    expect(el.textContent).toContain('Delivery address');
    expect(el.querySelector('#fullName-error')!.textContent).toContain('Full name is required');
  });

  it('goes to step 2 when the address is valid', () => {
    fixture.componentInstance.form.patchValue(validAddress);

    clickMainButton();

    expect(el.textContent).toContain('Deliver to');
    expect(el.textContent).toContain('Amina Alaoui');
  });

  it('keeps the address when going back to step 1', () => {
    fixture.componentInstance.form.patchValue(validAddress);
    clickMainButton();

    el.querySelector<HTMLButtonElement>('.checkout-back')!.click();
    fixture.detectChanges();

    expect(el.querySelector<HTMLInputElement>('#fullName')!.value).toBe('Amina Alaoui');
    expect(el.querySelector<HTMLInputElement>('#city')!.value).toBe('Rabat');
  });

  it('calls placeOrder with the right body on step 3', () => {
    orderService.placeOrder.mockReturnValue(of({ id: 'o1', reference: 'B01-ABCDE' }));
    fixture.componentInstance.form.patchValue(validAddress);

    clickMainButton();
    clickMainButton();
    clickMainButton();

    expect(orderService.placeOrder).toHaveBeenCalledWith(
      { items: [{ productId: 'p1', quantity: 2 }], address: { ...validAddress, notes: undefined }, paymentMethod: 'PAY_ON_DELIVERY' },
      expect.any(Array),
    );
  });

  it('clears the cart and opens the order page on success', () => {
    orderService.placeOrder.mockReturnValue(of({ id: 'o1', reference: 'B01-ABCDE' }));
    fixture.componentInstance.form.patchValue(validAddress);

    clickMainButton();
    clickMainButton();
    clickMainButton();

    expect(cart.isEmpty()).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/orders', 'o1'], { queryParams: { placed: 1 } });
  });

  it('shows the error message and stays on step 3 when the server fails', () => {
    const error = new HttpErrorResponse({ status: 409, error: { message: 'Not enough stock' } });
    orderService.placeOrder.mockReturnValue(throwError(() => error));
    fixture.componentInstance.form.patchValue(validAddress);

    clickMainButton();
    clickMainButton();
    clickMainButton();

    expect(el.querySelector('.checkout-error')!.textContent).toContain('Not enough stock');
    expect(el.textContent).toContain('Payment');
    expect(cart.isEmpty()).toBe(false);
  });
});
