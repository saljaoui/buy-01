import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';

import { ApiClient } from '../../core/api/api-client.service';
import { User } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { MediaService } from '../../shared/services/media-service';
import { OrderService, SellerOrderView } from '../../shared/services/order.service';
import { ProductResponse, ProductService } from '../../shared/services/product-service';
import { ToastService } from '../../shared/services/toast-service';
import { ConfirmService } from '../../shared/ui/confirm/confirm.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';
import { PillTone, StatusPillComponent } from '../../shared/ui/status-pill/status-pill.component';
import { SellerShellService } from '../seller/seller-layout/seller-shell.service';

/** Length of the "recent" window for revenue/orders, and of the period it's compared with. */
export const WINDOW_DAYS = 14;
const DAY_MS = 86_400_000;
const PRODUCTS_PREVIEW = 8;

export interface ProductRow {
  product: ProductResponse;
  photos: number;
  image: string | null;
  status: { label: string; tone: PillTone };
}

/** Daily totals for the last `days` days (oldest first), from orders that aren't cancelled. */
export function dailySeries(views: SellerOrderView[], days: number, pick: (v: SellerOrderView) => number, now = Date.now()): number[] {
  const today = startOfDay(now);
  const series = new Array<number>(days).fill(0);
  for (const v of views) {
    if (v.order.status === 'CANCELLED') continue;
    const age = Math.floor((today - startOfDay(Date.parse(v.order.createdAt))) / DAY_MS);
    if (age >= 0 && age < days) series[days - 1 - age] += pick(v);
  }
  return series;
}

/** % change between the last window and the one before it; null when there's nothing to compare. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    IconComponent,
    PageHeaderComponent,
    StatCardComponent,
    StatusPillComponent,
    EmptyStateComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly productService = inject(ProductService);
  private readonly mediaService = inject(MediaService);
  private readonly orderService = inject(OrderService);
  private readonly toastService = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly api = inject(ApiClient);
  private readonly shell = inject(SellerShellService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = signal<User | null>(null);
  readonly products = signal<ProductResponse[]>([]);
  readonly mediaCounts = signal<Record<string, number>>({});
  readonly coverImages = signal<Record<string, string>>({});
  readonly orders = signal<SellerOrderView[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly showAllProducts = signal(false);

  private readonly fragment = toSignal(inject(ActivatedRoute).fragment, { initialValue: null });

  protected readonly today = new Date();
  protected readonly windowDays = WINDOW_DAYS;

  // ---------- Products ----------

  readonly totalProducts = computed(() => this.products().length);
  readonly activeListings = computed(() => this.products().filter((p) => p.quantity > 0).length);
  readonly outOfStock = computed(() => this.totalProducts() - this.activeListings());
  readonly mediaTotal = computed(() => sum(Object.values(this.mediaCounts())));
  readonly productsWithMedia = computed(() => this.products().filter((p) => this.mediaCountFor(p.id) > 0).length);
  readonly needPhotos = computed(() => this.totalProducts() - this.productsWithMedia());
  readonly completeListings = computed(() => this.products().filter((p) => !this.needsWork(p)).length);

  readonly productRows = computed<ProductRow[]>(() =>
    this.products().map((product) => ({
      product,
      photos: this.mediaCountFor(product.id),
      image: this.coverImages()[product.id] ?? null,
      status: this.statusFor(product),
    })),
  );
  readonly visibleRows = computed(() =>
    this.showAllProducts() ? this.productRows() : this.productRows().slice(0, PRODUCTS_PREVIEW),
  );
  readonly hiddenRows = computed(() => Math.max(0, this.productRows().length - PRODUCTS_PREVIEW));

  // ---------- Sales (last 14 days vs the 14 before) ----------

  private readonly revenue28 = computed(() => dailySeries(this.orders(), WINDOW_DAYS * 2, (v) => v.sellerTotal));
  private readonly orders28 = computed(() => dailySeries(this.orders(), WINDOW_DAYS * 2, () => 1));
  readonly revenueSeries = computed(() => this.revenue28().slice(WINDOW_DAYS));
  readonly orderSeries = computed(() => this.orders28().slice(WINDOW_DAYS));
  readonly revenue = computed(() => sum(this.revenueSeries()));
  readonly orderCount = computed(() => sum(this.orderSeries()));
  readonly revenueTrend = computed(() => percentChange(this.revenue(), sum(this.revenue28().slice(0, WINDOW_DAYS))));
  readonly orderTrend = computed(() => percentChange(this.orderCount(), sum(this.orders28().slice(0, WINDOW_DAYS))));
  readonly needsAction = computed(
    () => this.orders().filter((v) => v.order.status === 'PENDING' || v.order.status === 'CONFIRMED').length,
  );
  readonly recentOrders = computed(() => this.orders().slice(0, 5));

  // ---------- Onboarding ----------

  readonly steps = computed(() => [
    {
      id: 'product',
      title: 'Add your first product',
      text: 'A clear title, an honest description and a price.',
      done: this.totalProducts() > 0,
      link: '/seller/products/new',
      cta: 'Add a product',
    },
    {
      id: 'photos',
      title: 'Add photos',
      text: 'Listings with photos sell far better. Up to 3 per product.',
      done: this.productsWithMedia() > 0,
      link: this.totalProducts() > 0 ? `/seller/products/${this.products()[0].id}/edit` : '/seller/products/new',
      cta: 'Add photos',
    },
    {
      id: 'order',
      title: 'Get your first order',
      text: 'Share your store link. Buyers pay when the parcel arrives.',
      done: this.orders().length > 0,
      link: '/products',
      cta: 'View your store',
    },
  ]);
  readonly stepsDone = computed(() => this.steps().filter((s) => s.done).length);
  readonly setupComplete = computed(() => this.stepsDone() === this.steps().length);
  readonly nextStepIndex = computed(() => this.steps().findIndex((s) => !s.done));

  readonly greeting = computed(() => {
    const h = this.today.getHours();
    const first = this.user()?.name.trim().split(/\s+/)[0];
    const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    return first ? `${part}, ${first}` : part;
  });

  readonly summary = computed(() => {
    if (this.totalProducts() === 0) return "Your store is ready for its first listing. Here's how to get going.";
    const parts = [`${this.activeListings()} of ${this.totalProducts()} listings are live`];
    if (this.needsAction()) parts.push(`${this.needsAction()} ${this.needsAction() === 1 ? 'order needs' : 'orders need'} you`);
    return parts.join(' · ') + '.';
  });

  constructor() {
    // Sidebar "Products" links to /seller#products: scroll there once the table is on screen.
    effect(() => {
      if (this.fragment() !== 'products' || this.isLoading()) return;
      setTimeout(() =>
        this.host.nativeElement.querySelector('#products')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }),
      );
    });
  }

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
              forkJoin({
                media: this.loadMedia(products),
                orders: this.orderService.sellerOrders(products.map((p) => p.id)).pipe(catchError(() => of([]))),
              }).pipe(map(({ media, orders }) => ({ user, products, media, orders }))),
            ),
          ),
        ),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ user, products, media, orders }) => {
          this.user.set(user);
          this.products.set(products);
          this.mediaCounts.set(media.counts);
          this.coverImages.set(media.covers);
          this.orders.set(orders);
          // Share with the shell so the sidebar badges and search are up to date.
          this.shell.setProducts(products, media.counts);
          this.shell.setOrders(orders);
        },
        error: (err) => this.errorMessage.set(this.api.getErrorMessage(err, 'Unable to load dashboard data.')),
      });
  }

  async deleteProduct(product: ProductResponse): Promise<void> {
    if (this.deletingId()) return;
    const ok = await this.confirm.ask({
      title: `Delete “${product.name}”?`,
      message: 'The listing and its photos are removed from your store. This cannot be undone.',
      confirmLabel: 'Delete product',
      tone: 'danger',
    });
    if (!ok) return;
    this.deletingId.set(product.id);
    this.productService
      .deleteProduct(product.id)
      .pipe(finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          this.toastService.success(`“${product.name}” was deleted.`);
          this.loadDashboard();
        },
        error: (err) => this.toastService.error(this.api.getErrorMessage(err, 'Product could not be deleted.')),
      });
  }

  mediaCountFor(productId: string): number {
    return this.mediaCounts()[productId] ?? 0;
  }

  statusFor(product: ProductResponse): { label: string; tone: PillTone } {
    if (product.quantity <= 0) return { label: 'Out of stock', tone: 'neutral' };
    if (this.mediaCountFor(product.id) === 0) return { label: 'Needs photos', tone: 'warning' };
    if (product.quantity <= 5) return { label: 'Low stock', tone: 'copper' };
    return { label: 'Live', tone: 'success' };
  }

  protected ratio(part: number, whole: number): number {
    return whole > 0 ? part / whole : 0;
  }

  private needsWork(product: ProductResponse): boolean {
    return (
      product.name.trim().length === 0 ||
      product.description.trim().length < 10 ||
      product.price <= 0 ||
      this.mediaCountFor(product.id) === 0
    );
  }

  /** Photo count and first photo (the cover buyers see) for each product. */
  private loadMedia(products: ProductResponse[]) {
    if (products.length === 0) return of({ counts: {}, covers: {} });
    return forkJoin(
      products.map((p) =>
        this.mediaService.getMediaByProduct(p.id).pipe(
          map((list) => ({ id: p.id, count: list.length, cover: list[0] ? this.mediaService.imageUrl(list[0]) : null })),
          catchError(() => of({ id: p.id, count: 0, cover: null })),
        ),
      ),
    ).pipe(
      map((entries) => ({
        counts: Object.fromEntries(entries.map((e) => [e.id, e.count])) as Record<string, number>,
        covers: Object.fromEntries(entries.filter((e) => e.cover).map((e) => [e.id, e.cover!])) as Record<string, string>,
      })),
    );
  }
}
