import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { ApiClient } from '../../core/api/api-client.service';
import { User } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { ProductResponse, ProductService } from '../../shared/services/product-service';
import { MediaService } from '../../shared/services/media-service';
import { ToastService } from '../../shared/services/toast-service';
import { IconComponent } from '../../shared/icon/icon.component';
import { SellerSidebarComponent } from '../seller/seller-sidebar/seller-sidebar.component';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, SellerSidebarComponent, IconComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly productService = inject(ProductService);
  private readonly mediaService = inject(MediaService);
  private readonly toastService = inject(ToastService);
  private readonly api = inject(ApiClient);

  user = signal<User | null>(null);
  products = signal<ProductResponse[]>([]);
  mediaCounts = signal<Record<string, number>>({});
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  totalProducts = computed(() => this.products().length);
  // TODO: Use a backend listing status when product-service exposes one.
  activeListings = computed(() => this.products().filter((product) => product.quantity > 0).length);
  mediaTotal = computed(() =>
    Object.values(this.mediaCounts()).reduce((total, count) => total + count, 0),
  );
  productsWithMedia = computed(() =>
    this.products().filter((product) => this.mediaCountFor(product.id) > 0).length,
  );
  draftTasks = computed(() =>
    this.products().filter((product) => this.needsWork(product)).length,
  );
  // TODO: Sort by backend createdAt when product-service exposes timestamps.
  recentProducts = computed(() => this.products().slice(0, 5));
  userInitials = computed(() => this.getInitials(this.user()?.name ?? ''));

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.userService
      .getCurrentUser()
      .pipe(
        switchMap((user) =>
          this.productService.getProductsOwnedBy(user.id).pipe(
            switchMap((products) =>
              this.loadMediaCounts(products).pipe(
                map((mediaCounts) => ({
                  user,
                  products,
                  mediaCounts,
                })),
              ),
            ),
          ),
        ),
      )
      .subscribe({
        next: ({ user, products, mediaCounts }) => {
          this.user.set(user);
          this.products.set(products);
          this.mediaCounts.set(mediaCounts);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(this.api.getErrorMessage(err, 'Unable to load dashboard data.'));
          this.isLoading.set(false);
        },
      });
  }

  deleteProduct(productId: string): void {
    this.productService.deleteProduct(productId).subscribe({
      next: () => {
        this.toastService.success('Product deleted successfully.');
        this.loadDashboard();
      },
      error: (err) => {
        this.toastService.error(this.api.getErrorMessage(err, 'Product could not be deleted.'));
      },
    });
  }

  mediaCountFor(productId: string): number {
    return this.mediaCounts()[productId] ?? 0;
  }

  statusFor(product: ProductResponse): 'Active' | 'Out of stock' | 'Needs media' {
    if (this.mediaCountFor(product.id) === 0) {
      return 'Needs media';
    }

    return product.quantity > 0 ? 'Active' : 'Out of stock';
  }

  private loadMediaCounts(products: ProductResponse[]) {
    if (products.length === 0) {
      return of({});
    }

    return forkJoin(
      products.map((product) =>
        this.mediaService.getMediaByProduct(product.id).pipe(
          map((media) => [product.id, media.length] as const),
          catchError(() => of([product.id, 0] as const)),
        ),
      ),
    ).pipe(map((entries) => Object.fromEntries(entries)));
  }

  private needsWork(product: ProductResponse): boolean {
    return (
      product.name.trim().length === 0 ||
      product.description.trim().length < 10 ||
      product.price <= 0 ||
      this.mediaCountFor(product.id) === 0
    );
  }

  private getInitials(name: string): string {
    return (
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'U'
    );
  }
}
