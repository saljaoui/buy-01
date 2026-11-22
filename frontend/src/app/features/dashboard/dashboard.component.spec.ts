import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { DashboardComponent, percentChange } from './dashboard.component';
import { UserService } from '../../core/services/user.service';
import { MediaService } from '../../shared/services/media-service';
import { OrderService } from '../../shared/services/order.service';
import { ProductService } from '../../shared/services/product-service';
import { ConfirmService } from '../../shared/ui/confirm/confirm.service';

describe('DashboardComponent', () => {
  const seller = { id: 'seller-1', name: 'Ada', email: 's@x.com', role: 'SELLER', avatar: null };
  const bowl = { id: 'a', name: 'Bowl', description: 'A wooden bowl', price: 10, quantity: 3, owner: true };
  const mug = { id: 'b', name: 'Mug', description: 'A clay mug', price: 8, quantity: 0, owner: true };
  const productService = { getProductsOwnedBy: vi.fn(), deleteProduct: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    productService.getProductsOwnedBy.mockReturnValue(of([]));
    productService.deleteProduct.mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: UserService, useValue: { getCurrentUser: () => of(seller) } },
        { provide: ProductService, useValue: productService },
        { provide: MediaService, useValue: { getMediaByProduct: () => of([]), imageUrl: () => '' } },
        { provide: OrderService, useValue: { sellerOrders: () => of([]) } },
      ],
    });
  });

  it('loads the products of the current seller', () => {
    TestBed.createComponent(DashboardComponent).detectChanges();

    expect(productService.getProductsOwnedBy).toHaveBeenCalledWith('seller-1');
  });

  it('shows the onboarding guide when the seller has no products', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid=onboarding]').textContent).toContain("Let's set up your store");
  });

  it('lists the seller products in the table', () => {
    productService.getProductsOwnedBy.mockReturnValue(of([bowl, mug]));

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.product-table tbody tr').length).toBe(2);
  });

  it('deletes a product after the seller confirms', async () => {
    productService.getProductsOwnedBy.mockReturnValue(of([bowl]));
    vi.spyOn(TestBed.inject(ConfirmService), 'ask').mockResolvedValue(true);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.row-btn.danger').click();
    await fixture.whenStable();

    expect(productService.deleteProduct).toHaveBeenCalledWith('a');
  });

  it('does not delete when the seller cancels', async () => {
    productService.getProductsOwnedBy.mockReturnValue(of([bowl]));
    vi.spyOn(TestBed.inject(ConfirmService), 'ask').mockResolvedValue(false);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.row-btn.danger').click();
    await fixture.whenStable();

    expect(productService.deleteProduct).not.toHaveBeenCalled();
  });

  it('percentChange computes the trend between two periods', () => {
    expect(percentChange(30, 20)).toBe(50);
    expect(percentChange(5, 0)).toBeNull();
  });
});
