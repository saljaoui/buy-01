import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { MediaManagerComponent } from './media-manager.component';
import { AuthService } from '../../auth/auth.service';
import { MediaOrderService } from '../../../shared/services/media-order.service';
import { Media, MediaService } from '../../../shared/services/media-service';
import { ProductResponse, ProductService } from '../../../shared/services/product-service';
import { ConfirmService } from '../../../shared/ui/confirm/confirm.service';

const m = (id: string, productId = 'a'): Media => ({ id, productId, imageUrl: '/media/' + id });

describe('MediaManagerComponent', () => {
  let apply: ReturnType<typeof vi.fn>;
  let del: ReturnType<typeof vi.fn>;

  const setup = (products: ProductResponse[], media: Record<string, Media[]>) => {
    apply = vi.fn(() => of([m('2'), m('3'), m('1b')]));
    del = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      imports: [MediaManagerComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: ProductService, useValue: { getProductsOwnedBy: () => of(products) } },
        { provide: MediaService, useValue: { getMediaByProduct: (id: string) => of(media[id] ?? []), imageUrl: (x: Media) => 'http://x' + x.imageUrl, deleteMedia: del } },
        { provide: MediaOrderService, useValue: { apply } },
      ],
    });
    vi.spyOn(TestBed.inject(AuthService), 'getStoredUser').mockReturnValue({ id: 's', name: 'S', email: 's@x', role: 'SELLER' });
    const fixture = TestBed.createComponent(MediaManagerComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  };

  const bowl: ProductResponse = { id: 'a', name: 'Bowl', description: 'A bowl', price: 1, quantity: 1, owner: true };

  it('no products: one empty state with one action, no filters', () => {
    const { el } = setup([], {});
    const empty = el.querySelector('[data-testid=no-products]')!;
    expect(empty.querySelectorAll('a, button').length).toBe(1);
    expect(empty.textContent).toContain('Create your first product');
    expect(el.querySelector('.mm-toolbar')).toBeNull();
    expect(el.querySelector('[data-testid=upload-open]')).toBeNull();
  });

  it('products without photos: the upload panel is the empty state; library hidden', () => {
    const { el } = setup([bowl], {});
    expect(el.querySelector('[data-testid=upload-panel]')).not.toBeNull();
    expect(el.querySelector('.mm-toolbar')).toBeNull();
  });

  it('with photos: grouped gallery, cover first, set as cover re-orders through MediaOrderService', () => {
    const { fixture, el } = setup([bowl], { a: [m('1'), m('2'), m('3')] });
    expect(el.querySelectorAll('[data-testid=media-group]').length).toBe(1);
    expect(el.querySelectorAll('[data-testid=media-tile]').length).toBe(3);
    expect(el.querySelector('.mm-cover')).not.toBeNull();

    el.querySelector<HTMLButtonElement>('[data-testid=set-cover]')!.click();
    fixture.detectChanges();
    const wanted = apply.mock.calls[0][2].map((p: { media: Media }) => p.media.id);
    expect(wanted).toEqual(['2', '3', '1']); // only photo 1 has to move
  });

  it('delete asks first', async () => {
    const { fixture, el } = setup([bowl], { a: [m('1'), m('2')] });
    vi.spyOn(TestBed.inject(ConfirmService), 'ask').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('[data-testid=delete-media]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(del).toHaveBeenCalledWith('1');
    expect(el.querySelectorAll('[data-testid=media-tile]').length).toBe(1);
  });
});
