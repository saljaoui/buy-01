import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { ApiClient, FORBIDDEN_MESSAGE } from '../api/api-client.service';
import { AuthService } from '../../features/auth/auth.service';
import { ToastService } from '../../shared/services/toast-service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let api: ApiClient;
  let router: Router;
  const auth = { getStoredToken: vi.fn(), isTokenExpired: vi.fn(), clearSession: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    auth.getStoredToken.mockReturnValue('my-token');
    auth.isTokenExpired.mockReturnValue(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    api = TestBed.inject(ApiClient);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  it('adds the token to requests sent to our API', () => {
    http.get(api.url('/products')).subscribe();
    const req = httpMock.expectOne(api.url('/products'));
    req.flush({});

    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
  });

  it('does not send the token to other websites', () => {
    req.flush({});

    expect(req.request.headers.has('Authorization')).toBe(false);
  });

  it('does not send an expired token', () => {
    auth.isTokenExpired.mockReturnValue(true);

    http.get(api.url('/products')).subscribe();
    const req = httpMock.expectOne(api.url('/products'));
    req.flush({});

    expect(req.request.headers.has('Authorization')).toBe(false);
  });

  it('logs out and goes to /login on a 401', () => {
    http.get(api.url('/users/me')).subscribe({ error: () => {} });
    httpMock.expectOne(api.url('/users/me')).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });

  it('ignores a 401 coming from the login endpoint', () => {
    http.post(api.url('/auth/login'), {}).subscribe({ error: () => {} });
    httpMock.expectOne(api.url('/auth/login')).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.clearSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows a permission message on a 403 and stays logged in', () => {
    http.delete(api.url('/products/1')).subscribe({ error: () => {} });
    httpMock.expectOne(api.url('/products/1')).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(auth.clearSession).not.toHaveBeenCalled();
    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(FORBIDDEN_MESSAGE);
  });
});
