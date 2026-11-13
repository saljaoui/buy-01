import { Injectable, inject } from '@angular/core';
import { Observable, concat, defer, filter, forkJoin, last, map, of, switchMap, tap, toArray } from 'rxjs';

import { Media, MediaService } from './media-service';

/** A photo in the order the seller wants: one already stored, or a new file. */
export type PhotoSource = { kind: 'existing'; media: Media } | { kind: 'new'; file: File };

export interface OrderPlan {
  /** Stored photos that go away. */
  remove: Media[];
  /** How many of the wanted photos already sit in the right order and stay untouched. */
  keep: number;
  /** Photos to (re-)upload, in order, after the kept ones. */
  upload: PhotoSource[];
}

/**
 * The media API has no "position" field: a product's photos come back in upload order,
 * and the first one is the cover buyers see. To change the order we keep the longest run
 * of photos that is already in place and re-upload the rest in the wanted order (a stored
 * photo is copied first, then its original is deleted, so nothing is lost if a step fails).
 */
export function planOrder(stored: Media[], wanted: PhotoSource[]): OrderPlan {
  const wantedIds = new Set(wanted.filter((p) => p.kind === 'existing').map((p) => (p as { media: Media }).media.id));
  const remove = stored.filter((m) => !wantedIds.has(m.id));
  const position = new Map(stored.filter((m) => wantedIds.has(m.id)).map((m, i) => [m.id, i]));

  let keep = 0;
  let lastIndex = -1;
  for (const photo of wanted) {
    if (photo.kind !== 'existing') break;
    const i = position.get(photo.media.id) ?? -1;
    if (i <= lastIndex) break;
    lastIndex = i;
    keep++;
  }
  return { remove, keep, upload: wanted.slice(keep) };
}

@Injectable({ providedIn: 'root' })
export class MediaOrderService {
  private readonly media = inject(MediaService);

  /**
   * Makes the product's stored photos match `wanted`. `onProgress(i, percent)` reports
   * the upload of `plan.upload[i]`. Emits the final media list once.
   */
  apply(
    productId: string,
    stored: Media[],
    wanted: PhotoSource[],
    onProgress: (uploadIndex: number, percent: number) => void = () => {},
  ): Observable<Media[]> {
    const plan = planOrder(stored, wanted);
    const kept = wanted.slice(0, plan.keep).map((p) => (p as { media: Media }).media);

    const removals = plan.remove.length
      ? forkJoin(plan.remove.map((m) => this.media.deleteMedia(m.id))).pipe(map(() => undefined))
      : of(undefined);

    const uploads = plan.upload.map((photo, i) =>
      defer(() => {
        const file$ = photo.kind === 'new' ? of<Blob>(photo.file) : this.media.download(photo.media);
        return file$.pipe(
          switchMap((blob) => this.media.uploadWithProgress(productId, blob, fileNameFor(photo, blob))),
          tap((e) => onProgress(i, e.type === 'done' ? 100 : e.percent)),
          filter((e): e is { type: 'done'; media: Media } => e.type === 'done'),
          map((e) => e.media),
          // A copied photo: remove the original only after the copy is safely stored.
          switchMap((saved) =>
            photo.kind === 'existing' ? this.media.deleteMedia(photo.media.id).pipe(map(() => saved)) : of(saved),
          ),
        );
      }),
    );

    return removals.pipe(
      switchMap(() => (uploads.length ? concat(...uploads).pipe(toArray()) : of<Media[]>([]))),
      map((uploaded) => [...kept, ...uploaded]),
      last(),
    );
  }
}

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' };

/** The server keeps the file extension and serves the photo by it, so it must match the real type. */
function fileNameFor(photo: PhotoSource, blob: Blob): string {
  if (photo.kind === 'new') return photo.file.name;
  return `${photo.media.id}.${EXTENSIONS[blob.type] ?? 'jpg'}`;
}
