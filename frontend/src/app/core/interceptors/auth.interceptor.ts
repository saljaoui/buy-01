import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { ApiClient, FORBIDDEN_MESSAGE, SESSION_EXPIRED_MESSAGE, isAuthEndpoint } from '../api/api-client.service';
import { AuthService } from '../../features/auth/auth.service';
import { ToastService } from '../../shared/services/toast-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const api = inject(ApiClient);

  // 1) Only send the token to OUR backend, never to other websites.
  const isOurApi = req.url.startsWith(api.baseUrl);
  const token = authService.getStoredToken();

  if (token && isOurApi && !authService.isTokenExpired(token)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || !isOurApi || isAuthEndpoint(req.url)) {
        return throwError(() => error);
      }

      // 2) 401 = "we don't know who you are" -> log out and go to login.
      if (error.status === 401) {
        // Only the first failing request handles it (others find the session already cleared).
        if (authService.getStoredToken()) {
          authService.clearSession();
          toast.warning(SESSION_EXPIRED_MESSAGE, 4000);
          const returnUrl = router.url.startsWith('/login') ? undefined : router.url;
          void router.navigate(['/login'], { queryParams: returnUrl ? { returnUrl } : {} });
        }
      }

      // 3) 403 = "we know who you are, but you are not allowed" -> stay logged in, show message.
      if (error.status === 403) {
        toast.error(api.getErrorMessage(error, FORBIDDEN_MESSAGE));
      }

      return throwError(() => error);
    }),
  );
};
