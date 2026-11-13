import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { MediaOrderService, PhotoSource, planOrder } from './media-order.service';
import { Media, MediaService } from './media-service';

const m = (id: string): Media => ({ id, productId: 'p', imageUrl: `/media/${id}` });
const ex = (media: Media): PhotoSource => ({ kind: 'existing', media });

describe('planOrder', () => {
  const [a, b, c] = [m('a'), m('b'), m('c')];

  it('keeps everything when the order is unchanged', () => {
    expect(planOrder([a, b, c], [ex(a), ex(b), ex(c)])).toEqual({ remove: [], keep: 3, upload: [] });
  });

  it('moving the 2nd photo to the front only re-uploads the 1st', () => {
    const plan = planOrder([a, b, c], [ex(b), ex(c), ex(a)]);
    expect(plan.keep).toBe(2);
    expect(plan.upload).toEqual([ex(a)]);
  });

  it('removed photos are deleted; new files go after the kept ones', () => {
    const file = new File(['x'], 'x.png', { type: 'image/png' });
    const plan = planOrder([a, b, c], [ex(a), ex(c), { kind: 'new', file }]);
    expect(plan.remove).toEqual([b]);
    expect(plan.keep).toBe(2);
    expect(plan.upload).toEqual([{ kind: 'new', file }]);
  });
});

describe('MediaOrderService.apply', () => {
  it('copies a moved photo first, then deletes its original', async () => {
    const calls: string[] = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MediaService,
          useValue: {
            download: (media: Media) => (calls.push('download ' + media.id), of(new Blob(['x'], { type: 'image/png' }))),
            uploadWithProgress: (_p: string, _b: Blob, name: string) => (calls.push('upload ' + name), of({ type: 'progress', percent: 50 }, { type: 'done', media: m('a2') })),
            deleteMedia: (id: string) => (calls.push('delete ' + id), of(undefined)),
          },
        },
      ],
    });
    const progress: number[] = [];
    const [a, b] = [m('a'), m('b')];
    const result = await new Promise<Media[]>((resolve) =>
      TestBed.inject(MediaOrderService).apply('p', [a, b], [ex(b), ex(a)], (_i, pct) => progress.push(pct)).subscribe(resolve),
    );
    expect(calls).toEqual(['download a', 'upload a.png', 'delete a']);
    expect(result.map((x) => x.id)).toEqual(['b', 'a2']);
    expect(progress).toEqual([50, 100]);
  });
});
