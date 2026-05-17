import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { LocalStorageService } from '../global/local-storage-service';
import { Router } from '@angular/router';
import { GlobalService } from '../global/global-service';
import { EMPTY, Observable } from 'rxjs';
import { ProductImage } from './product-service';


export interface MediaUploadData {
  id: string;
  base64Image: string;
  contentType: string;
}
@Injectable({
  providedIn: 'root',
})

export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(LocalStorageService);
  private readonly API = GlobalService.clientIP;

  publishMedia(productId: string, files: File[]): Observable<any> {
    const token = this.storage.get('buy01.auth.token');
    if (!token) {
      this.router.navigate(['/login']);
      return EMPTY;
    }
    const formData = new FormData();
    formData.append('productId', productId);
    files.forEach((file) => {
      formData.append('images', file, file.name);
    })
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + token
    })
    return this.http.post<any>(`${this.API}/media/upload`, formData, { headers });
  }

  getMediaByPost(productId: string): Observable<MediaUploadData[]> {
    const token = this.storage.get('buy01.auth.token');
    if (!token) {
      this.router.navigate(['/login']);
      return EMPTY;
    }
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    })
    return this.http.get<MediaUploadData[]>(`${this.API}/media/product/${productId}`, { headers });
  }

  updateMedia(productId: string, data: ProductImage[]): Observable<any> {
    const token = this.storage.get('buy01.auth.token');
    if (!token) {
      this.router.navigate(['/login']);
      return EMPTY;
    }
    const formData = new FormData();
    formData.append('productId', productId);
    data.forEach((d) => {
      
      formData.append('images', d.file, d.file.name);
    })
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + token
    })
    return this.http.put<any>(`${this.API}/media/product`, formData, { headers });
  }
}
