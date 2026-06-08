import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';

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
  owner?: boolean;
  userId?: string;
}

export interface CreateProductResponse {
  id: string;
}

export interface DeleteProductResponse {
  success?: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly api = inject(ApiClient);

  getProducts(): Observable<ProductResponse[]> {
    return this.api.get<ProductResponse[]>('/products');
  }

  getProduct(productId: string): Observable<ProductResponse> {
    return this.api.get<ProductResponse>(`/products/${productId}`);
  }

  getProductsOwnedBy(userId: string): Observable<ProductResponse[]> {
    return this.api.get<ProductResponse[]>(`/products/ownedBy/${userId}`);
  }

  publishProduct(product: ProductRequest): Observable<CreateProductResponse> {
    const formData = new FormData();
    formData.append(
      'product',
      new Blob([JSON.stringify(product)], {
        type: 'application/json'
      })
    );
    return this.api.post<CreateProductResponse>('/products', formData);
  }

  deleteProduct(productId: string): Observable<DeleteProductResponse> {
    return this.api.delete<DeleteProductResponse>(`/products/${productId}`);
  }

  updateProduct(productId: string, product: ProductRequest): Observable<ProductResponse> {
    return this.api.put<ProductResponse>(`/products/${productId}`, product);
  }

  getPrimaryImageUrl(productId: string): string {
    return this.api.url(`/media/primary/product/${productId}`);
  }

}
