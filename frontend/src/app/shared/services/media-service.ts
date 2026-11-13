import { HttpClient, HttpEventType } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { environment } from '../../../environments/environment';

export interface Media {
  id: string;
  productId: string;
  imageUrl: string;
}

/** Progress of one upload: percentages while sending, then the saved media. */
export type UploadProgress = { type: 'progress'; percent: number } | { type: 'done'; media: Media };

export interface ProductImage {
  id: string;
  isNew: boolean;
  deleted: boolean;
  file: File;
  preview: string;
}

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private readonly api = inject(ApiClient);
  private readonly http = inject(HttpClient);

  upload(productId: string, file: File): Observable<Media> {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('productId', productId);

    return this.api.post<Media>('/media', formData);
  }

  /** Same endpoint as `upload`, but reports upload progress. */
  uploadWithProgress(productId: string, file: Blob, fileName = 'photo.jpg'): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file, file instanceof File ? file.name : fileName);
    formData.append('productId', productId);
    return this.http.post<Media>(this.api.url('/media'), formData, { reportProgress: true, observe: 'events' }).pipe(
      filter((e) => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
      map((e): UploadProgress => {
        if (e.type === HttpEventType.Response) return { type: 'done', media: e.body as Media };
        const total = 'total' in e && e.total ? e.total : file.size || 1;
        const loaded = 'loaded' in e ? e.loaded : 0;
        return { type: 'progress', percent: Math.min(99, Math.round((loaded / total) * 100)) };
      }),
    );
  }

  /** The stored image file, e.g. to re-upload it in a new position. */
  download(media: Media): Observable<Blob> {
    return this.http.get(this.imageUrl(media), { responseType: 'blob' });
  }

  getMediaByProduct(productId: string): Observable<Media[]> {
    return this.api.get<Media[]>(`/media/product/${productId}`);
  }

  deleteMedia(mediaId: string): Observable<void> {
    return this.api.delete<void>(`/media/${mediaId}`);
  }

  imageUrl(media: Media): string {
    return `${environment.apiBaseUrl}${media.imageUrl}`;
  }
}