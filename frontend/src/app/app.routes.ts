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
];
