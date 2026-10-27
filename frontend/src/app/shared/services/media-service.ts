import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { environment } from '../../../environments/environment';

export interface Media {
  id: string;
  productId: string;
  imageUrl: string;
}

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

  upload(productId: string, file: File): Observable<Media> {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('productId', productId);

    return this.api.post<Media>('/media', formData);
  }

  getMediaByProduct(productId: string): Observable<Media[]> {
    return this.api.get<Media[]>(`/media/product/${productId}`);
  }

  deleteMedia(mediaId: string): Observable<void> {
    return this.api.delete<void>(`/media/${mediaId}`);
  }

  imageUrl(media: Media): string {
    console.log('MediaService.imageUrl called with media:', media);
    return `${environment.apiBaseUrl}${media.imageUrl}`;
  }
}