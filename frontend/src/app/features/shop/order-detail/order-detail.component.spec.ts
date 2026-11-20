import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { OrderDetailComponent } from './order-detail.component';
import { CartService } from '../../../shared/services/cart.service';
import { OrderService } from '../../../shared/services/order.service';
import { ProductService } from '../../../shared/services/product-service';

describe('OrderDetailComponent', () => {
  const order = {
    id: 'o1', reference: 'B01-AAAAA', buyerId: 'b1', buyerName: 'Amina', status: 'PENDING',
    items: [{ productId: 'p1', name: 'Lamp', price: 20, quantity: 2, imageUrl: null }],
    subtotal: 40, shippingFee: 5, total: 45, paymentMethod: 'PAY_ON_DELIVERY',
    address: { fullName: 'Amina', phone: '0612345678', street: '1 Rue', city: 'Rabat', postalCode: '10000' },
    createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z', history: [{ status: 'PENDING', at: '2026-11-01T10:00:00Z' }],
  };
  const orderService = { getOrder: vi.fn(), cancelOrder: vi.fn() };
  const productService = { getProduct: vi.fn() };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [OrderDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: OrderService, useValue: orderService },
        { provide: ProductService, useValue: productService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'o1' }), queryParamMap: convertToParamMap({}) }, queryParamMap: of(convertToParamMap({})) } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('loads the order from the URL id and shows its number', () => {
    orderService.getOrder.mockReturnValue(of(order));

    const fixture = TestBed.createComponent(OrderDetailComponent);
    fixture.detectChanges();

    expect(orderService.getOrder).toHaveBeenCalledWith('o1');
    expect(fixture.nativeElement.textContent).toContain('B01-AAAAA');
  });

  it('shows the error message when the order cannot be loaded', () => {
    orderService.getOrder.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { message: 'This order belongs to another account.' } })));

    const fixture = TestBed.createComponent(OrderDetailComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('This order belongs to another account.');
  });

  it('cancels a pending order after the buyer confirms', () => {
    orderService.getOrder.mockReturnValue(of(order));
    orderService.cancelOrder.mockReturnValue(of({ ...order, status: 'CANCELLED' }));
    const fixture = TestBed.createComponent(OrderDetailComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.btn-danger').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.confirm-box .btn-danger').click();

    expect(orderService.cancelOrder).toHaveBeenCalledWith('o1');
  });

  it('hides the cancel button when the order has shipped', () => {
    orderService.getOrder.mockReturnValue(of({ ...order, status: 'SHIPPED' }));

    const fixture = TestBed.createComponent(OrderDetailComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.btn-danger')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('can no longer be cancelled');
  });

  it('"Order again" adds the items to the cart and opens the cart', () => {
    orderService.getOrder.mockReturnValue(of(order));
    productService.getProduct.mockReturnValue(of({ id: 'p1', name: 'Lamp', description: '', price: 20, quantity: 10, owner: false }));
    const fixture = TestBed.createComponent(OrderDetailComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.btn-primary').click();

    expect(TestBed.inject(CartService).quantityOf('p1')).toBe(2);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/cart']);
  });
});
