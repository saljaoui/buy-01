import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';

export interface Media {
  id: string;
  base64Image: string;
  contentType: string | null;
}

export type MediaUploadData = Media;

export interface ProductImage {
  id: string;
  isNew: boolean;
  deleted: boolean;
  file: File;
  preview: string;
}

export interface MediaMessageResponse {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private readonly api = inject(ApiClient);

  publishMedia(productId: string, files: File[]): Observable<MediaMessageResponse> {
    const formData = new FormData();
    formData.append('productId', productId);
    files.forEach((file) => {
      formData.append('images', file, file.name);
    });
    return this.api.post<MediaMessageResponse>('/media/upload', formData);
  }

  getMediaByProduct(productId: string): Observable<Media[]> {
    return this.api.get<Media[]>(`/media/product/${productId}`);
  }

  replaceProductMedia(productId: string, files: File[]): Observable<MediaMessageResponse> {
    const formData = new FormData();
    formData.append('productId', productId);
    files.forEach((file) => {
      formData.append('images', file, file.name);
    });
    return this.api.put<MediaMessageResponse>('/media/product', formData);
  }

  deleteProductMedia(productId: string): Observable<MediaMessageResponse> {
    return this.api.delete<MediaMessageResponse>(`/media/product/${productId}`);
  }

  toDataUrl(media: Media): string {
    const contentType = media.contentType || 'image/jpeg';
    return `data:${contentType};base64,${media.base64Image}`;
  }

}
