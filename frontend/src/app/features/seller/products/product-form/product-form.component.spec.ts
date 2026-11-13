import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ProductFormComponent } from './product-form.component';
import { AuthService } from '../../../auth/auth.service';
import { MediaOrderService } from '../../../../shared/services/media-order.service';
import { MediaService } from '../../../../shared/services/media-service';
import { ProductService } from '../../../../shared/services/product-service';

describe('ProductFormComponent (new product)', () => {
  let publish: ReturnType<typeof vi.fn>;
  let apply: ReturnType<typeof vi.fn>;

  const setup = () => {
    publish = vi.fn((body) => of({ id: 'p-new', owner: true, ...body }));
    apply = vi.fn(() => of([{ id: 'm1', productId: 'p-new', imageUrl: '/media/m1' }]));
    TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'products/:id', children: [] }]),
        { provide: ProductService, useValue: { publishProduct: publish, getProductsOwnedBy: () => of([]) } },
        { provide: MediaService, useValue: { getMediaByProduct: () => of([]), imageUrl: (m: { imageUrl: string }) => 'http://x' + m.imageUrl } },
        { provide: MediaOrderService, useValue: { apply } },
      ],
    });
    vi.spyOn(TestBed.inject(AuthService), 'getStoredUser').mockReturnValue({ id: 's', name: 'S', email: 's@x', role: 'SELLER' });
    const fixture = TestBed.createComponent(ProductFormComponent);
    fixture.detectChanges();
    return { fixture, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  };

  const type = (el: HTMLElement, selector: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  beforeEach(() => {
    globalThis.URL.createObjectURL ??= () => 'blob:mock';
    globalThis.URL.revokeObjectURL ??= () => {};
  });

  it('live preview and checklist follow the form as you type', () => {
    const { fixture, el } = setup();
    expect(el.querySelector('.pf-preview h3')!.textContent).toContain('Your product title');
    type(el, '#pf-name', 'Walnut bowl');
    type(el, '#pf-price', '48');
    fixture.detectChanges();
    expect(el.querySelector('.pf-preview h3')!.textContent).toContain('Walnut bowl');
    expect(el.querySelector('.pf-preview .product-price')!.textContent).toContain('$48.00');
    expect(el.querySelector('[data-check=name]')!.classList).toContain('done');
    expect(el.querySelector('[data-check=price]')!.classList).toContain('done');
    expect(el.querySelector('[data-check=description]')!.classList).not.toContain('done');
  });

  it('stock stepper never goes below 0; low stock shows the badge buyers will see', () => {
    const { fixture, cmp, el } = setup();
    cmp.form.controls.quantity.setValue(1);
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>("[aria-label='One less in stock']")!.click();
    fixture.detectChanges();
    expect(cmp.form.controls.quantity.value).toBe(0);
    expect(el.querySelector<HTMLButtonElement>("[aria-label='One less in stock']")!.disabled).toBe(true);
    expect(el.querySelector('.pf-preview-stock')!.textContent).toContain('Out of stock');
  });

  it('reports unsaved changes after an edit', () => {
    const { fixture, cmp, el } = setup();
    expect(cmp.hasUnsavedChanges()).toBe(false);
    type(el, '#pf-name', 'Draft');
    fixture.detectChanges();
    expect(cmp.hasUnsavedChanges()).toBe(true);
    expect(el.querySelector('.pf-status')!.textContent).toContain('Unsaved changes');
  });

  it('does not save an invalid form', () => {
    const { fixture, el } = setup();
    el.querySelector<HTMLButtonElement>('[data-testid=save]')!.click();
    fixture.detectChanges();
    expect(publish).not.toHaveBeenCalled();
    expect(el.querySelector('#pf-name-err')).not.toBeNull();
  });

  it('creates the product, uploads its photos in order, then goes to the product page', async () => {
    const { fixture, cmp, el } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    cmp.form.setValue({ name: 'Walnut bowl', description: 'Turned from one piece of walnut.', price: 48, quantity: 4 });
    (cmp as unknown as { addFiles(f: File[]): void }).addFiles([new File(['x'], 'a.png', { type: 'image/png' })]);
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('[data-testid=save]')!.click();
    await fixture.whenStable();

    expect(publish).toHaveBeenCalledWith({ name: 'Walnut bowl', description: 'Turned from one piece of walnut.', price: 48, quantity: 4 });
    expect(apply).toHaveBeenCalledWith('p-new', [], [expect.objectContaining({ kind: 'new' })], expect.any(Function));
    expect(navigate).toHaveBeenCalledWith(['/products', 'p-new']);
    expect(cmp.hasUnsavedChanges()).toBe(false);
    expect(cmp.isSaving()).toBe(false);
  });
});
