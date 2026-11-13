import { Routes } from '@angular/router';

import { clientGuard, guestGuard, sellerGuard } from './core/guards/auth.guards';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'products',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
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
  // ---- Buying (cart is open to everyone; the rest needs a client account) ----
  {
    path: 'cart',
    title: 'Your cart · Buy01',
    loadComponent: () => import('./features/shop/cart/cart-page.component').then((m) => m.CartPageComponent),
  },
  {
    path: 'checkout',
    title: 'Checkout · Buy01',
    canActivate: [clientGuard],
    loadComponent: () => import('./features/shop/checkout/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    path: 'orders',
    title: 'Your orders · Buy01',
    canActivate: [clientGuard],
    loadComponent: () => import('./features/shop/orders/order-list.component').then((m) => m.OrderListComponent),
  },
  {
    path: 'orders/:id',
    title: 'Order · Buy01',
    canActivate: [clientGuard],
    loadComponent: () =>
      import('./features/shop/order-detail/order-detail.component').then((m) => m.OrderDetailComponent),
  },
  {
    path: 'account',
    title: 'Your account · Buy01',
    canActivate: [clientGuard],
    loadComponent: () => import('./features/shop/account/account.component').then((m) => m.AccountComponent),
  },
  {
    path: 'seller',
    canActivate: [sellerGuard],
    canActivateChild: [sellerGuard],
    // One shell (sidebar + content container) for every seller page.
    loadComponent: () =>
      import('./features/seller/seller-layout/seller-layout.component').then((m) => m.SellerLayoutComponent),
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
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/seller/products/product-form/product-form.component').then(
            (m) => m.ProductFormComponent
          ),
      },
      {
        path: 'products/:id/edit',
        canDeactivate: [unsavedChangesGuard],
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
        path: 'orders',
        loadComponent: () =>
          import('./features/seller/orders/seller-orders.component').then((m) => m.SellerOrdersComponent),
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
