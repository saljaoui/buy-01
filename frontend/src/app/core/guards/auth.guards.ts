import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { UserRole } from '../models/user.model';
import { AuthUser } from '../../features/auth/auth.models';
import { AuthService } from '../../features/auth/auth.service';

/** Where each role lands after login (or when it hits a page it can't use). */
export function resolveHomePath(user: AuthUser | null): string {
  if (!user) {
    return '/products';
  }
  return user.role === 'SELLER' ? '/seller' : '/products';
}

/**
 * Only allow a `returnUrl` that points inside our app (starts with a single "/").
 * This prevents open-redirects like `?returnUrl=https://evil.com`.
 */
export function safeReturnUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('/') || url.startsWith('//')) {
    return null;
  }
  return url;
}

function loginRedirect(router: Router, attemptedUrl: string): UrlTree {
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: attemptedUrl },
  });
}

/** Pages for visitors only (login/register). Logged-in users go to their home. */
export const guestGuard: CanActivateFn = () => {
  const user = inject(AuthService).getAuthenticatedUser();
  return user ? inject(Router).parseUrl(resolveHomePath(user)) : true;
};

/** Any logged-in user (CLIENT or SELLER). */
export const authGuard: CanActivateFn = (_route, state) => {
  const user = inject(AuthService).getAuthenticatedUser();
  return user ? true : loginRedirect(inject(Router), state.url);
};

/** Logged-in user with one of the given roles. Use for canActivate and canActivateChild. */
export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return (_route, state) => {
    const router = inject(Router);
    const user = inject(AuthService).getAuthenticatedUser();

    if (!user) {
      return loginRedirect(router, state.url);
    }
    return roles.includes(user.role) ? true : router.parseUrl(resolveHomePath(user));
  };
}

export const sellerGuard = roleGuard('SELLER');
export const clientGuard = roleGuard('CLIENT');
