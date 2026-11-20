import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { MediaManagerComponent } from './media-manager.component';
import { AuthService } from '../../auth/auth.service';
import { MediaOrderService } from '../../../shared/services/media-order.service';
import { MediaService } from '../../../shared/services/media-service';
import { ProductService } from '../../../shared/services/product-service';
import { ConfirmService } from '../../../shared/ui/confirm/confirm.service';

describe('MediaManagerComponent', () => {
  const bowl = { id: 'a', name: 'Bowl', description: 'A bowl', price: 10, quantity: 1, owner: true };
  const photo1 = { id: '1', productId: 'a', imageUrl: '/media/1' };
  const photo2 = { id: '2', productId: 'a', imageUrl: '/media/2' };
  const productService = { getProductsOwnedBy: vi.fn() };
  const mediaService = { getMediaByProduct: vi.fn(), deleteMedia: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mediaService.getMediaByProduct.mockReturnValue(of([]));
    mediaService.deleteMedia.mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      imports: [MediaManagerComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: ProductService, useValue: productService },
        { provide: MediaService, useValue: mediaService },
        { provide: MediaOrderService, useValue: { apply: vi.fn() } },
      ],
    });
    vi.spyOn(TestBed.inject(AuthService), 'getStoredUser').mockReturnValue({ id: 's', name: 'S', email: 's@x.com', role: 'SELLER' });
  });

  it('asks to create a product first when the seller has no products', () => {
    productService.getProductsOwnedBy.mockReturnValue(of([]));

    const fixture = TestBed.createComponent(MediaManagerComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid=no-products]').textContent).toContain('Create your first product');
  });

  it('shows the upload panel when the products have no photos', () => {
    productService.getProductsOwnedBy.mockReturnValue(of([bowl]));

    const fixture = TestBed.createComponent(MediaManagerComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid=upload-panel]')).not.toBeNull();
  });

  it('shows one tile per photo', () => {
    productService.getProductsOwnedBy.mockReturnValue(of([bowl]));
    mediaService.getMediaByProduct.mockReturnValue(of([photo1, photo2]));

    const fixture = TestBed.createComponent(MediaManagerComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-testid=media-tile]').length).toBe(2);
  });

  it('deletes a photo after the seller confirms', async () => {
    productService.getProductsOwnedBy.mockReturnValue(of([bowl]));
    mediaService.getMediaByProduct.mockReturnValue(of([photo1, photo2]));
    vi.spyOn(TestBed.inject(ConfirmService), 'ask').mockResolvedValue(true);
    const fixture = TestBed.createComponent(MediaManagerComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid=delete-media]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mediaService.deleteMedia).toHaveBeenCalledWith('1');
    expect(fixture.nativeElement.querySelectorAll('[data-testid=media-tile]').length).toBe(1);
  });

  it('does not delete a photo when the seller cancels', async () => {
    productService.getProductsOwnedBy.mockReturnValue(of([bowl]));
    mediaService.getMediaByProduct.mockReturnValue(of([photo1]));
    vi.spyOn(TestBed.inject(ConfirmService), 'ask').mockResolvedValue(false);
    const fixture = TestBed.createComponent(MediaManagerComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid=delete-media]').click();
    await fixture.whenStable();

    expect(mediaService.deleteMedia).not.toHaveBeenCalled();
  });
});
