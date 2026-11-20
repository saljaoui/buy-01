import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { MediaOrderService, planOrder } from './media-order.service';
import { Media, MediaService } from './media-service';

describe('MediaOrderService', () => {
  const photoA: Media = { id: 'a', productId: 'p', imageUrl: '/media/a' };
  const photoB: Media = { id: 'b', productId: 'p', imageUrl: '/media/b' };

  it('planOrder keeps all photos when the order is unchanged', () => {
    const plan = planOrder([photoA, photoB], [{ kind: 'existing', media: photoA }, { kind: 'existing', media: photoB }]);

    expect(plan).toEqual({ remove: [], keep: 2, upload: [] });
  });

  it('planOrder deletes the photos the seller removed', () => {
    const plan = planOrder([photoA, photoB], [{ kind: 'existing', media: photoA }]);

    expect(plan.remove).toEqual([photoB]);
  });

  it('planOrder re-uploads only the photo that has to move', () => {
    const plan = planOrder([photoA, photoB], [{ kind: 'existing', media: photoB }, { kind: 'existing', media: photoA }]);

    expect(plan.keep).toBe(1);
    expect(plan.upload).toEqual([{ kind: 'existing', media: photoA }]);
  });

  it('apply uploads a new file after the kept photos', async () => {
    const saved: Media = { id: 'new', productId: 'p', imageUrl: '/media/new' };
    const mediaService = { uploadWithProgress: vi.fn(() => of({ type: 'done', media: saved })), deleteMedia: vi.fn(), download: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: MediaService, useValue: mediaService }] });
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    const result = await firstValueFrom(TestBed.inject(MediaOrderService).apply('p', [photoA], [{ kind: 'existing', media: photoA }, { kind: 'new', file }]));

    expect(result.map((m) => m.id)).toEqual(['a', 'new']);
    expect(mediaService.deleteMedia).not.toHaveBeenCalled();
  });
});
