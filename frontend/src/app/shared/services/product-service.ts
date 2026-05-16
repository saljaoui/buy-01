import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { GlobalService } from '../global/global-service';
import { LocalStorageService } from '../global/local-storage-service';
import { Router } from '@angular/router';


export interface ProductRequest {
  name: string;
  description: string;
  price: number;
  quantity: number;
}

export interface ProductResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  userId: string
}


export interface ProductImage {
  id: string;
  isNew: boolean;
  deleted: boolean;
  file: File;
  preview: string;
}
@Injectable({
  providedIn: 'root'
})



export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(LocalStorageService);
  private readonly API = GlobalService.clientIP;

  getProducts(): Observable<ProductResponse[]> {
    const token = this.storage.get('buy01.auth.token');
    if (!token) {
      this.router.navigate(['/login']);
      return EMPTY;
    }
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    })
    return this.http.get<ProductResponse[]>(`${this.API}/products`, { headers });
  }

  getProduct(productId: string): Observable<ProductResponse> {
    const token = this.storage.get('buy01.auth.token');
    if (!token) {
      this.router.navigate(['/login']);
      return EMPTY;
    }
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    })
    return this.http.get<ProductResponse>(`${this.API}/products/${productId}`, { headers });
  }

  publishProduct(product: ProductRequest): Observable<any> {
    const token = this.storage.get('buy01.auth.token');
    if (!token) {
      this.router.navigate(['/login']);
      return EMPTY;
    }
    const formData = new FormData();
    formData.append(
      'product',
      new Blob([JSON.stringify(product)], {
        type: 'application/json'
      })
    );
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + token
    })
    return this.http.post<any>(`${this.API}/products`, formData, { headers });
  }

  deleteProduct(productId: string): Observable<any> {
    const token = this.storage.get('buy01.auth.token');
    if (!token) {
      this.router.navigate(['/login']);
      return EMPTY;
    }
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    })
    return this.http.delete<string>(`${this.API}/products/${productId}`, { headers });
  }

  updateProduct(productId: string, product: ProductRequest): Observable<any> {
    const token = this.storage.get('buy01.auth.token');
    if (!token) {
      this.router.navigate(['/login']);
      return EMPTY;
    }
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    })
    return this.http.put<string>(`${this.API}/products/${productId}`, { headers });
  }

}
