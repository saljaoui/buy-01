import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { authGuard, clientGuard, guestGuard, safeReturnUrl, sellerGuard } from './auth.guards';
import { AuthService } from '../../features/auth/auth.service';

function makeToken(expSecondsFromNow: number): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }));
  return `header.${payload}.signature`;
}

function login(role: 'CLIENT' | 'SELLER', expSecondsFromNow = 3600): void {
  localStorage.setItem('buy01.auth.token', makeToken(expSecondsFromNow));
  localStorage.setItem(
    'buy01.auth.user',
    JSON.stringify({ id: '1', name: 'Test', email: 't@t.com', role }),
  );
}

describe('auth guards', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = (url: string) => ({ url }) as RouterStateSnapshot;
  let router: Router;

  const run = (guard: typeof authGuard, url = '/seller') =>
    TestBed.runInInjectionContext(() => guard(route, state(url)));

  const asUrl = (result: unknown) => router.serializeUrl(result as UrlTree);

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
    router = TestBed.inject(Router);
  });

  it('authGuard sends visitors to login with returnUrl', () => {
    expect(asUrl(run(authGuard, '/orders'))).toBe('/login?returnUrl=%2Forders');
  });

  it('authGuard allows any logged-in user', () => {
    login('CLIENT');
    expect(run(authGuard)).toBe(true);
  });

  it('expired token is treated as logged out and session is cleared', () => {
    login('SELLER', -10);
    expect(asUrl(run(sellerGuard, '/seller'))).toBe('/login?returnUrl=%2Fseller');
    expect(TestBed.inject(AuthService).getStoredToken()).toBeNull();
  });

  it('user without token is treated as logged out', () => {
    login('SELLER');
    localStorage.removeItem('buy01.auth.token');
    expect(asUrl(run(sellerGuard))).toContain('/login');
  });

  it('sellerGuard blocks clients', () => {
    login('CLIENT');
    expect(asUrl(run(sellerGuard))).toBe('/products');
  });

  it('sellerGuard allows sellers', () => {
    login('SELLER');
    expect(run(sellerGuard)).toBe(true);
  });

  it('clientGuard blocks sellers and allows clients', () => {
    login('SELLER');
    expect(asUrl(run(clientGuard, '/cart'))).toBe('/seller');
    login('CLIENT');
    expect(run(clientGuard, '/cart')).toBe(true);
  });

  it('guestGuard redirects logged-in users home', () => {
    expect(run(guestGuard, '/login')).toBe(true);
    login('SELLER');
    expect(asUrl(run(guestGuard, '/login'))).toBe('/seller');
  });

  it('safeReturnUrl rejects external urls', () => {
    expect(safeReturnUrl('/orders')).toBe('/orders');
    expect(safeReturnUrl('//evil.com')).toBeNull();
    expect(safeReturnUrl('https://evil.com')).toBeNull();
    expect(safeReturnUrl(null)).toBeNull();
  });
});
