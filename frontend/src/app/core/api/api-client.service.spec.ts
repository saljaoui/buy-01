import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ApiClient, FORBIDDEN_MESSAGE, SESSION_EXPIRED_MESSAGE } from './api-client.service';

describe('ApiClient', () => {
  let api: ApiClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('builds the full URL with or without a leading slash', () => {
    const withoutSlash = api.url('products');
    const withSlash = api.url('/products');

    expect(withoutSlash).toBe(`${api.baseUrl}/products`);
    expect(withSlash).toBe(`${api.baseUrl}/products`);
  });

  it('sends a GET request and returns the response', () => {
    let result: unknown;

    api.get('/products/1').subscribe((data) => (result = data));
    const req = httpMock.expectOne(`${api.baseUrl}/products/1`);
    req.flush({ id: '1' });

    expect(req.request.method).toBe('GET');
    expect(result).toEqual({ id: '1' });
  });

  it('sends a POST request with the body', () => {
    api.post('/products', { name: 'Lamp' }).subscribe();
    const req = httpMock.expectOne(`${api.baseUrl}/products`);
    req.flush({});

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Lamp' });
  });

  it('sends a DELETE request', () => {
    api.delete('/products/1').subscribe();
    const req = httpMock.expectOne(`${api.baseUrl}/products/1`);
    req.flush(null);

    expect(req.request.method).toBe('DELETE');
  });

  it('getErrorMessage returns the backend message', () => {
    const error = new HttpErrorResponse({ status: 400, error: { message: 'Price must be positive' } });

    const message = api.getErrorMessage(error);

    expect(message).toBe('Price must be positive');
  });

  it('getErrorMessage returns "session expired" for a 401 outside login', () => {
    const error = new HttpErrorResponse({ status: 401, url: `${api.baseUrl}/users/me`, error: { message: 'JWT expired' } });

    const message = api.getErrorMessage(error);

    expect(message).toBe(SESSION_EXPIRED_MESSAGE);
  });

  it('getErrorMessage returns the permission message for a 403', () => {
    const error = new HttpErrorResponse({ status: 403 });

    const message = api.getErrorMessage(error, 'Could not delete.');

    expect(message).toBe(FORBIDDEN_MESSAGE);
  });

  it('getErrorMessage explains when the server is unreachable', () => {
    const error = new HttpErrorResponse({ status: 0 });

    const message = api.getErrorMessage(error);

    expect(message).toBe('Unable to reach the backend server.');
  });
});
