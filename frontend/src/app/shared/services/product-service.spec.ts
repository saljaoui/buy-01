import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ProductResponse, ProductService, applySearch } from './product-service';
import { environment } from '../../../environments/environment';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiBaseUrl;
  const lamp: ProductResponse = { id: 'p1', name: 'Lamp', description: 'Warm light', price: 20, quantity: 5, owner: true };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getProducts sends a GET with page and size', () => {
    service.getProducts(0, 10).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/products?page=0&size=10`);
    req.flush({ content: [lamp], totalElements: 1, totalPages: 1 });

    expect(req.request.method).toBe('GET');
  });

  it('getProduct sends a GET to /products/{id} and returns the product', () => {
    let result: ProductResponse | undefined;

    service.getProduct('p1').subscribe((p) => (result = p));
    httpMock.expectOne(`${baseUrl}/products/p1`).flush(lamp);

    expect(result).toEqual(lamp);
  });

  it('getProductsOwnedBy keeps only the products owned by the user', () => {
    const mug = { ...lamp, id: 'p2', owner: false };
    let result: ProductResponse[] = [];

    service.getProductsOwnedBy('seller-1').subscribe((list) => (result = list));
    httpMock.expectOne(`${baseUrl}/products?page=0&size=100`).flush({ content: [lamp, mug], totalElements: 2, totalPages: 1 });

    expect(result.map((p) => p.id)).toEqual(['p1']);
  });

  it('publishProduct sends a POST with the product', () => {
    const body = { name: 'Lamp', description: 'Warm light', price: 20, quantity: 5 };

    service.publishProduct(body).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/products`);
    req.flush(lamp);

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
  });

  it('updateProduct sends a PUT with the new data', () => {
    const body = { name: 'Big lamp', description: 'Warm light', price: 25, quantity: 5 };

    service.updateProduct('p1', body).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/products/p1`);
    req.flush(lamp);

    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
  });

  it('deleteProduct sends a DELETE', () => {
    service.deleteProduct('p1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/products/p1`);
    req.flush(null);

    expect(req.request.method).toBe('DELETE');
  });
});

describe('applySearch', () => {
  const lamp = { id: '1', name: 'Walnut Lamp', description: 'Warm light', price: 129, quantity: 6, owner: false };
  const throw_ = { id: '2', name: 'Linen Throw', description: 'Soft linen', price: 64, quantity: 0, owner: false };

  it('finds products whose name contains the search word', () => {
    const page = applySearch([lamp, throw_], { page: 0, size: 12, q: 'LINEN' });

    expect(page.content.map((p) => p.id)).toEqual(['2']);
  });

  it('hides sold-out products when inStock is set', () => {
    const page = applySearch([lamp, throw_], { page: 0, size: 12, inStock: true });

    expect(page.content.map((p) => p.id)).toEqual(['1']);
  });
});
