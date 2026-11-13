import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { ProductSearchQuery } from '../../core/models/commerce.models';

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

  /**
   * Keyword + facet search with pagination.
   *
   * Planned backend: GET /api/products?q=&minPrice=&maxPrice=&inStock=&sort=&page=&size=
   * Until the product service supports these parameters, this fetches the catalog
   * once and filters, sorts and pages it in the browser. Pages call only this method,
   * so switching to the real query is a change in one place.
   */
  searchProducts(query: ProductSearchQuery): Observable<Page<ProductResponse>> {
    return this.getProducts(0, 200).pipe(map((page) => applySearch(page.content, query)));
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

export function applySearch(products: ProductResponse[], query: ProductSearchQuery): Page<ProductResponse> {
  const q = query.q?.trim().toLowerCase() ?? '';
  const min = query.minPrice ?? null;
  const max = query.maxPrice ?? null;

  let result = products.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
    if (min !== null && p.price < min) return false;
    if (max !== null && p.price > max) return false;
    if (query.inStock && p.quantity <= 0) return false;
    return true;
  });

  switch (query.sort) {
    case 'price-asc':
      result = [...result].sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result = [...result].sort((a, b) => b.price - a.price);
      break;
    case 'name':
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  const size = Math.max(1, query.size);
  const totalPages = Math.ceil(result.length / size);
  const page = Math.min(Math.max(0, query.page), Math.max(0, totalPages - 1));
  return {
    content: result.slice(page * size, page * size + size),
    totalElements: result.length,
    totalPages,
  };
}
