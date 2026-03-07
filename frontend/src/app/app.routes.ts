import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/login/login.component').then(m => m.LoginComponent),
    },
    {
        path: 'register',
        loadComponent: () =>
            import('./features/auth/register/register.component').then(m => m.RegisterComponent),
    },
      {
    path: 'products',
    loadComponent: () =>
      import('./features/products/product-list/product-list.component').then(
        m => m.ProductListComponent
      ),
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./features/products/product-details/product-details.component').then(
        m => m.ProductDetailsComponent
      ),
  },
{
    path: 'seller',
    // canActivate: [AuthGuard, RoleGuard],
    // data: { role: 'SELLER' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            m => m.DashboardComponent
          ),
      },
      // {
      //   path: 'products',
      //   loadComponent: () =>
      //     import('./features/seller/products/seller-products.component').then(
      //       m => m.SellerProductsComponent
      //     ),
      // },
      // {
      //   path: 'products/new',
      //   loadComponent: () =>
      //     import('./features/seller/products/product-form/product-form.component').then(
      //       m => m.ProductFormComponent
      //     ),
      // },
      // {
      //   path: 'products/:id/edit',
      //   loadComponent: () =>
      //     import('./features/seller/products/product-form/product-form.component').then(
      //       m => m.ProductFormComponent
      //     ),
      // },
      // {
      //   path: 'media',
      //   loadComponent: () =>
      //     import('./features/seller/media/media-manager.component').then(
      //       m => m.MediaManagerComponent
      //     ),
      // },
      // {
      //   path: 'profile',
      //   loadComponent: () =>
      //     import('./features/seller/profile/seller-profile.component').then(
      //       m => m.SellerProfileComponent
      //     ),
      // },
    ],
  },
];
