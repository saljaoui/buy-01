
import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ProductService } from './product-service';
import {
  ProductRequest,
  ProductResponse,
  Page,
} from './product-service';

import { environment } from '../../../environments/environment';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiBaseUrl;

  const mockProduct: ProductResponse = {
    id: 'product-1',
    name: 'Laptop',
    description: 'Gaming laptop',
    price: 12000,
    quantity: 5,
    owner: true,
  };

  const mockProductRequest: ProductRequest = {
    name: 'Laptop',
    description: 'Gaming laptop',
    price: 12000,
    quantity: 5,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ProductService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send a GET request to get products with pagination', () => {
    const mockResponse: Page<ProductResponse> = {
      content: [mockProduct],
      totalElements: 1,
      totalPages: 1,
    };

    service.getProducts(0, 10).subscribe((data) => {
      expect(data).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/products?page=0&size=10`
    );

    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });

  it('should send a GET request to get a product by ID', () => {
    service.getProduct('product-1').subscribe((data) => {
      expect(data).toEqual(mockProduct);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/products/product-1`
    );

    expect(req.request.method).toBe('GET');

    req.flush(mockProduct);
  });

  it('should return only products owned by the user', () => {
    const mockProducts: ProductResponse[] = [
      {
        id: 'product-1',
        name: 'Laptop',
        description: 'Gaming laptop',
        price: 12000,
        quantity: 5,
        owner: true,
      },
      {
        id: 'product-2',
        name: 'Phone',
        description: 'Smartphone',
        price: 5000,
        quantity: 10,
        owner: false,
      },
      {
        id: 'product-3',
        name: 'Keyboard',
        description: 'Mechanical keyboard',
        price: 800,
        quantity: 15,
        owner: true,
      },
    ];

    const mockResponse: Page<ProductResponse> = {
      content: mockProducts,
      totalElements: 3,
      totalPages: 1,
    };

    service.getProductsOwnedBy('user-1').subscribe((data) => {
      expect(data.length).toBe(2);
      expect(data.every((product) => product.owner)).toBe(true);
      expect(data[0].id).toBe('product-1');
      expect(data[1].id).toBe('product-3');
    });

    const req = httpMock.expectOne(
      `${baseUrl}/products?page=0&size=100`
    );

    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });

  it('should send a POST request to publish a product', () => {
    service.publishProduct(mockProductRequest).subscribe((data) => {
      expect(data).toEqual(mockProduct);
    });

    const req = httpMock.expectOne(`${baseUrl}/products`);

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockProductRequest);

    req.flush(mockProduct);
  });

  it('should send a DELETE request to delete a product', () => {
    service.deleteProduct('product-1').subscribe((data) => {
      expect(data).toBeNull();
    });

    const req = httpMock.expectOne(
      `${baseUrl}/products/product-1`
    );

    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });

  it('should send a PUT request to update a product', () => {
    const updatedProduct: ProductResponse = {
      ...mockProduct,
      name: 'Updated Laptop',
      price: 15000,
    };

    const updateRequest: ProductRequest = {
      ...mockProductRequest,
      name: 'Updated Laptop',
      price: 15000,
    };

    service.updateProduct('product-1', updateRequest).subscribe((data) => {
      expect(data).toEqual(updatedProduct);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/products/product-1`
    );

    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateRequest);

    req.flush(updatedProduct);
  });
});
