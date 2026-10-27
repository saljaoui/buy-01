import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

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
  owner: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly api = inject(ApiClient);

  getProducts(page: number, size: number): Observable<Page<ProductResponse>> {
    return this.api.get<Page<ProductResponse>>(`/products?page=${page}&size=${size}`);
  }

  getProduct(productId: string): Observable<ProductResponse> {
    return this.api.get<ProductResponse>(`/products/${productId}`);
  }

  getProductsOwnedBy(userId: string): Observable<ProductResponse[]> {
    return this.getProducts(0, 100).pipe(
      map((page) => page.content.filter((p) => p.owner)),
    );
  }

  publishProduct(product: ProductRequest): Observable<ProductResponse> {
    return this.api.post<ProductResponse>('/products', product);
  }

  deleteProduct(productId: string): Observable<void> {
    return this.api.delete<void>(`/products/${productId}`);
  }

  updateProduct(productId: string, product: ProductRequest): Observable<ProductResponse> {
    return this.api.put<ProductResponse>(`/products/${productId}`, product);
  }
}
