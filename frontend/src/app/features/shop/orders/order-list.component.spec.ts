import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { OrderListComponent } from './order-list.component';
import { OrderService } from '../../../shared/services/order.service';

describe('OrderListComponent', () => {
  const order = {
    id: 'o1', reference: 'B01-AAAAA', status: 'PENDING', createdAt: '2026-11-01T10:00:00Z', total: 45,
    items: [{ productId: 'p1', name: 'Lamp', price: 20, quantity: 2, imageUrl: null }],
  };
  const orderService = { myOrders: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [OrderListComponent],
      providers: [provideRouter([]), provideHttpClient(), { provide: OrderService, useValue: orderService }],
    });
  });

  it('shows one row per order', () => {
    orderService.myOrders.mockReturnValue(of([order]));

    const fixture = TestBed.createComponent(OrderListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.order-row').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.order-row').textContent).toContain('B01-AAAAA');
  });

  it('shows "No orders yet" when the buyer has no orders', () => {
    orderService.myOrders.mockReturnValue(of([]));

    const fixture = TestBed.createComponent(OrderListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No orders yet');
  });

  it('loads the orders of the chosen status', () => {
    orderService.myOrders.mockReturnValue(of([order]));
    const fixture = TestBed.createComponent(OrderListComponent);
    fixture.detectChanges();
    const delivered = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('.segmented button')).find((b) => b.textContent!.includes('Delivered'))!;

    delivered.click();

    expect(orderService.myOrders).toHaveBeenLastCalledWith({ q: '', status: 'DELIVERED' });
  });

  it('shows the error message when the orders cannot load', () => {
    orderService.myOrders.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { message: 'Server is down' } })));

    const fixture = TestBed.createComponent(OrderListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Server is down');
    expect(fixture.nativeElement.textContent).toContain('Try again');
  });
});
