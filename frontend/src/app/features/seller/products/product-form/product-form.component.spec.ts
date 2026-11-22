import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ProductFormComponent } from './product-form.component';
import { AuthService } from '../../../auth/auth.service';
import { MediaOrderService } from '../../../../shared/services/media-order.service';
import { MediaService } from '../../../../shared/services/media-service';
import { ProductService } from '../../../../shared/services/product-service';

describe('ProductFormComponent', () => {
  const productService = { publishProduct: vi.fn(), getProductsOwnedBy: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    productService.getProductsOwnedBy.mockReturnValue(of([]));
    TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: ProductService, useValue: productService },
        { provide: MediaService, useValue: { getMediaByProduct: () => of([]), imageUrl: () => '' } },
        { provide: MediaOrderService, useValue: { apply: vi.fn() } },
      ],
    });
    vi.spyOn(TestBed.inject(AuthService), 'getStoredUser').mockReturnValue({ id: 's', name: 'S', email: 's@x.com', role: 'SELLER' });
  });

  it('does not save an empty form and shows an error under the name', () => {
    const fixture = TestBed.createComponent(ProductFormComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid=save]').click();
    fixture.detectChanges();

    expect(productService.publishProduct).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#pf-name-err')).not.toBeNull();
  });

  it('creates the product and opens its page when the form is valid', () => {
    productService.publishProduct.mockReturnValue(of({ id: 'p-new' }));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ProductFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ name: 'Walnut bowl', description: 'Turned from one piece of walnut.', price: 48, quantity: 4 });

    fixture.nativeElement.querySelector('[data-testid=save]').click();

    expect(productService.publishProduct).toHaveBeenCalledWith({ name: 'Walnut bowl', description: 'Turned from one piece of walnut.', price: 48, quantity: 4 });
    expect(navigate).toHaveBeenCalledWith(['/products', 'p-new']);
  });

  it('reports unsaved changes after the seller types', () => {
    const fixture = TestBed.createComponent(ProductFormComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#pf-name');

    input.value = 'Draft';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });

  it('shows the typed name in the live preview', () => {
    const fixture = TestBed.createComponent(ProductFormComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#pf-name');

    input.value = 'Walnut bowl';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pf-preview h3').textContent).toContain('Walnut bowl');
  });

  it('does not let the stock go below 0', () => {
    const fixture = TestBed.createComponent(ProductFormComponent);
    fixture.componentInstance.form.controls.quantity.setValue(0);
    fixture.detectChanges();

    const minus = fixture.nativeElement.querySelector("[aria-label='One less in stock']");

    expect(minus.disabled).toBe(true);
    expect(fixture.componentInstance.form.controls.quantity.value).toBe(0);
  });
});
