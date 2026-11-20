import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { authGuard, clientGuard, guestGuard, safeReturnUrl, sellerGuard } from './auth.guards';
import { AuthService } from '../../features/auth/auth.service';

describe('auth guards', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/orders' } as RouterStateSnapshot;
  const auth = { getAuthenticatedUser: vi.fn() };
  const client = { id: '1', name: 'Amina', email: 'a@x.com', role: 'CLIENT' };
  const seller = { id: '2', name: 'Shop', email: 's@x.com', role: 'SELLER' };
  let router: Router;

  beforeEach(() => {
    auth.getAuthenticatedUser.mockReset();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
    router = TestBed.inject(Router);
  });

  it('authGuard sends a visitor to /login with a returnUrl', () => {
    auth.getAuthenticatedUser.mockReturnValue(null);

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Forders');
  });

  it('authGuard lets a logged-in user in', () => {
    auth.getAuthenticatedUser.mockReturnValue(client);

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBe(true);
  });

  it('sellerGuard blocks a client', () => {
    auth.getAuthenticatedUser.mockReturnValue(client);

    const result = TestBed.runInInjectionContext(() => sellerGuard(route, state));

    expect(router.serializeUrl(result as UrlTree)).toBe('/products');
  });

  it('sellerGuard lets a seller in', () => {
    auth.getAuthenticatedUser.mockReturnValue(seller);

    const result = TestBed.runInInjectionContext(() => sellerGuard(route, state));

    expect(result).toBe(true);
  });

  it('clientGuard sends a seller to /seller', () => {
    auth.getAuthenticatedUser.mockReturnValue(seller);

    const result = TestBed.runInInjectionContext(() => clientGuard(route, state));

    expect(router.serializeUrl(result as UrlTree)).toBe('/seller');
  });

  it('guestGuard sends a logged-in seller to /seller', () => {
    auth.getAuthenticatedUser.mockReturnValue(seller);

    const result = TestBed.runInInjectionContext(() => guestGuard(route, state));

    expect(router.serializeUrl(result as UrlTree)).toBe('/seller');
  });

  it('safeReturnUrl accepts inside links and rejects external ones', () => {
    expect(safeReturnUrl('/orders')).toBe('/orders');
  });
});
