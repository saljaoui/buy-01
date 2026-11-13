import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  provideHttpClient,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { ApiClient, FORBIDDEN_MESSAGE, SESSION_EXPIRED_MESSAGE } from './api-client.service';

describe('ApiClient', () => {
  let service: ApiClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ApiClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should construct URL without a leading slash', () => {
    expect(service.url('products')).toBe(
      `${service.baseUrl}/products`
    );
  });

  it('should construct URL with a leading slash', () => {
    expect(service.url('/products')).toBe(
      `${service.baseUrl}/products`
    );
  });

  it('should send a GET request', () => {
    const mockData = { id: 1, name: 'Laptop' };

    service.get('/products').subscribe((data) => {
      expect(data).toEqual(mockData);
    });

    const req = httpMock.expectOne(
      `${service.baseUrl}/products`
    );

    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('should send a POST request', () => {
    const body = { name: 'Laptop' };

    service.post('/products', body).subscribe();

    const req = httpMock.expectOne(
      `${service.baseUrl}/products`
    );

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);

    req.flush({ id: 1, ...body });
  });

  it('should send a PUT request', () => {
    const body = { name: 'Updated Laptop' };

    service.put('/products/1', body).subscribe();

    const req = httpMock.expectOne(
      `${service.baseUrl}/products/1`
    );

    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);

    req.flush({ id: 1, ...body });
  });

  it('should send a DELETE request', () => {
    service.delete('/products/1').subscribe();

    const req = httpMock.expectOne(
      `${service.baseUrl}/products/1`
    );

    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });

  it('should return the backend string error', () => {
    const error = new HttpErrorResponse({
      error: 'Product not found',
      status: 404,
    });

    expect(service.getErrorMessage(error))
      .toBe('Product not found');
  });

  it('should return the backend message', () => {
    const error = new HttpErrorResponse({
      error: { message: 'Invalid credentials' },
      status: 401,
      url: 'http://localhost:8080/api/auth/login',
    });

    expect(service.getErrorMessage(error))
      .toBe('Invalid credentials');
  });

  it('should return the session-expired message for 401 outside login/register', () => {
    const error = new HttpErrorResponse({
      error: { message: 'JWT expired' },
      status: 401,
      url: 'http://localhost:8080/api/users/me',
    });

    expect(service.getErrorMessage(error)).toBe(SESSION_EXPIRED_MESSAGE);
  });

  it('should return a permission message for 403 without a backend message', () => {
    const error = new HttpErrorResponse({ status: 403 });

    expect(service.getErrorMessage(error, 'Product could not be deleted.')).toBe(FORBIDDEN_MESSAGE);
  });

  it('should handle network errors', () => {
    const error = new HttpErrorResponse({
      status: 0,
    });

    expect(service.getErrorMessage(error))
      .toBe('Unable to reach the backend server.');
  });

  it('should handle regular JavaScript errors', () => {
    const error = new Error('Something failed');

    expect(service.getErrorMessage(error))
      .toBe('Something failed');
  });

  it('should return fallback for unknown errors', () => {
    expect(service.getErrorMessage(null))
      .toBe('Something went wrong.');
  });
});
