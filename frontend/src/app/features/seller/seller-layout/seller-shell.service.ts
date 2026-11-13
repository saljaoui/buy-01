import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { OrderStatus } from '../../../core/models/commerce.models';
import { MediaService } from '../../../shared/services/media-service';
import { OrderService, SellerOrderView } from '../../../shared/services/order.service';
import { ProductResponse, ProductService } from '../../../shared/services/product-service';
import { AuthService } from '../../auth/auth.service';

/** Orders the seller still has to act on. */
export const NEEDS_ACTION: OrderStatus[] = ['PENDING', 'CONFIRMED'];

/**
 * What the seller shell knows about the signed-in seller's store: products, how many
 * photos each has, and their orders. Loaded once for the sidebar badges, the topbar
 * indicator and the global search; pages call `refresh()` after they change something.
 */
@Injectable({ providedIn: 'root' })
export class SellerShellService {
  private readonly auth = inject(AuthService);
  private readonly productService = inject(ProductService);
  private readonly mediaService = inject(MediaService);
  private readonly orderService = inject(OrderService);

  /** null until the first load finishes. */
  readonly products = signal<ProductResponse[] | null>(null);
  readonly mediaCounts = signal<Record<string, number>>({});
  readonly orders = signal<SellerOrderView[]>([]);
  readonly loading = signal(false);
  /** Bumped when the profile (name / avatar) changes, so the sidebar re-reads it. */
  readonly profileVersion = signal(0);

  readonly productIds = computed(() => (this.products() ?? []).map((p) => p.id));
  readonly productCount = computed(() => this.products()?.length ?? 0);
  readonly mediaCount = computed(() => Object.values(this.mediaCounts()).reduce((a, b) => a + b, 0));
  readonly ordersNeedingAction = computed(
    () => this.orders().filter((v) => NEEDS_ACTION.includes(v.order.status)).length,
  );

  private loaded = false;

  /** Loads once per session; later calls are no-ops unless `force` is true. */
  ensureLoaded(force = false): void {
    if ((this.loaded && !force) || this.loading()) return;
    const user = this.auth.getStoredUser();
    if (!user || user.role !== 'SELLER') return;
    this.loaded = true;
    this.loading.set(true);

    this.productService
      .getProductsOwnedBy(user.id)
      .pipe(
        tap((products) => this.products.set(products)),
        switchMap((products) =>
          forkJoin({
            media: this.loadMediaCounts(products),
            orders: this.orderService.sellerOrders(products.map((p) => p.id)).pipe(catchError(() => of([]))),
          }),
        ),
        catchError(() => {
          this.loaded = false; // try again on the next page
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((result) => {
        if (!result) return;
        this.mediaCounts.set(result.media);
        this.orders.set(result.orders);
      });
  }

  /** Reload everything, e.g. after creating or deleting a product. */
  refresh(): void {
    this.ensureLoaded(true);
  }

  /** A page that already loaded these can share them instead of loading twice. */
  setProducts(products: ProductResponse[], mediaCounts?: Record<string, number>): void {
    this.products.set(products);
    if (mediaCounts) this.mediaCounts.set(mediaCounts);
  }

  profileChanged(): void {
    this.profileVersion.update((v) => v + 1);
  }

  setOrders(orders: SellerOrderView[]): void {
    this.orders.set(orders);
  }

  /** Forget everything (sign out). */
  reset(): void {
    this.loaded = false;
    this.products.set(null);
    this.mediaCounts.set({});
    this.orders.set([]);
  }

  private loadMediaCounts(products: ProductResponse[]): Observable<Record<string, number>> {
    if (products.length === 0) return of({});
    return forkJoin(
      products.map((p) =>
        this.mediaService.getMediaByProduct(p.id).pipe(
          map((list) => [p.id, list.length] as const),
          catchError(() => of([p.id, 0] as const)),
        ),
      ),
    ).pipe(map((entries) => Object.fromEntries(entries)));
  }
}
