import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, Routes } from '@angular/router';

import { AuthUser } from './features/auth/auth.models';
import { AuthService } from './features/auth/auth.service';

function resolveHomePath(user: AuthUser | null): string {
  if (!user) {
    return '/products';
  }

  return user.role === 'SELLER' ? '/seller' : '/products';
}

const redirectAuthenticatedUser: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.getStoredUser();

  return user ? router.parseUrl(resolveHomePath(user)) : true;
};

const requireSellerAccess: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.getStoredUser();

  if (!user) {
    return router.parseUrl('/login');
  }

  return user.role === 'SELLER' ? true : router.parseUrl('/products');
};

const requireSellerChildAccess: CanActivateChildFn = (childRoute, state) =>
  requireSellerAccess(childRoute, state);

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'products',
  },
  {
    path: 'login',
    canActivate: [redirectAuthenticatedUser],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [redirectAuthenticatedUser],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/product-list/product-list.component').then((m) => m.ProductListComponent),
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./features/products/product-details/product-details.component').then(
        (m) => m.ProductDetailsComponent
      ),
  },
  {
    path: 'seller',
    canActivate: [requireSellerAccess],
    canActivateChild: [requireSellerChildAccess],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./features/seller/products/product-form/product-form.component').then(
            (m) => m.ProductFormComponent
          ),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./features/seller/products/product-form/product-form.component').then(
            (m) => m.ProductFormComponent
          ),
      },
      {
        path: 'media',
        loadComponent: () =>
          import('./features/seller/media/media-manager.component').then(
            (m) => m.MediaManagerComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/seller/profile/seller-profile.component').then(
            (m) => m.SellerProfileComponent
          ),
      },
    ],
  },
  {
    path: 'not-found',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
  {
    path: '**',
    redirectTo: 'not-found',
  },
];
