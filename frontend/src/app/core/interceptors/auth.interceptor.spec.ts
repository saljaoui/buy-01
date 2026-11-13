import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { ApiClient, FORBIDDEN_MESSAGE, SESSION_EXPIRED_MESSAGE } from '../api/api-client.service';
import { AuthService } from '../../features/auth/auth.service';
import { ToastService } from '../../shared/services/toast-service';

function makeToken(expSecondsFromNow: number): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }));
  return `header.${payload}.signature`;
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let api: ApiClient;
  let toast: ToastService;
  let router: Router;

  const login = (exp = 3600) => {
    localStorage.setItem('buy01.auth.token', makeToken(exp));
    localStorage.setItem(
      'buy01.auth.user',
      JSON.stringify({ id: '1', name: 'T', email: 't@t.com', role: 'CLIENT' }),
    );
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    api = TestBed.inject(ApiClient);
    toast = TestBed.inject(ToastService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => backend.verify());

  it('adds the token to our API requests', () => {
    login();
    http.get(api.url('/products')).subscribe();
    const req = backend.expectOne(api.url('/products'));
    expect(req.request.headers.get('Authorization')).toMatch(/^Bearer /);
    req.flush({});
  });

  it('does NOT send the token to other websites', () => {
    login();
    http.get('https://other-site.com/data').subscribe();
    const req = backend.expectOne('https://other-site.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does NOT send an expired token', () => {
    login(-10);
    http.get(api.url('/products')).subscribe();
    const req = backend.expectOne(api.url('/products'));
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('401: logs out, shows one toast, redirects to login', () => {
    login();
    http.get(api.url('/users/me')).subscribe({ error: () => undefined });
    http.get(api.url('/products/1')).subscribe({ error: () => undefined });

    backend.expectOne(api.url('/users/me')).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(api.url('/products/1')).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(TestBed.inject(AuthService).getStoredToken()).toBeNull();
    expect(toast.toasts().map((t) => t.message)).toEqual([SESSION_EXPIRED_MESSAGE]);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(vi.mocked(router.navigate).mock.calls[0][0]).toEqual(['/login']);
  });

  it('401 on login (wrong password) does not trigger logout logic', () => {
    login();
    http.post(api.url('/auth/login'), {}).subscribe({ error: () => undefined });
    backend.expectOne(api.url('/auth/login')).flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(TestBed.inject(AuthService).getStoredToken()).not.toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('403: stays logged in and shows a permission message', () => {
    login();
    http.delete(api.url('/products/1')).subscribe({ error: () => undefined });
    backend.expectOne(api.url('/products/1')).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(TestBed.inject(AuthService).getStoredToken()).not.toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(toast.toasts().map((t) => t.message)).toEqual([FORBIDDEN_MESSAGE]);
  });

  it('403: uses the backend message when there is one', () => {
    login();
    http.delete(api.url('/products/1')).subscribe({ error: () => undefined });
    backend
      .expectOne(api.url('/products/1'))
      .flush({ message: 'You can only delete your own products' }, { status: 403, statusText: 'Forbidden' });

    expect(toast.toasts()[0].message).toBe('You can only delete your own products');
  });
});
