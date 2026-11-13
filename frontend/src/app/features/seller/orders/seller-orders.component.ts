import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { ORDER_FLOW, ORDER_STATUS_LABEL, OrderStatus, nextSellerStatus } from '../../../core/models/commerce.models';
import { IconComponent } from '../../../shared/icon/icon.component';
import { OrderService, SellerOrderView } from '../../../shared/services/order.service';
import { ProductService } from '../../../shared/services/product-service';
import { ToastService } from '../../../shared/services/toast-service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { StatusPillComponent } from '../../../shared/ui/status-pill/status-pill.component';
import { AuthService } from '../../auth/auth.service';
import { STATUS_FILTERS } from '../../shop/orders/order-list.component';
import { SellerShellService } from '../seller-layout/seller-shell.service';

/** Button label for the next step of each status. */
export const NEXT_ACTION: Partial<Record<OrderStatus, string>> = {
  PENDING: 'Confirm',
  CONFIRMED: 'Mark shipped',
  SHIPPED: 'Mark delivered',
};

/** Same matching as OrderService: order number, buyer, or one of the products. */
export function matchesOrder(view: SellerOrderView, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return (
    view.order.reference.toLowerCase().includes(term) ||
    view.order.buyerName.toLowerCase().includes(term) ||
    view.order.items.some((i) => i.name.toLowerCase().includes(term))
  );
}

@Component({
  selector: 'app-seller-orders',
  imports: [RouterLink, CurrencyPipe, DatePipe, IconComponent, PageHeaderComponent, StatusPillComponent, EmptyStateComponent],
  templateUrl: './seller-orders.html',
  styleUrl: './seller-orders.scss',
})
export class SellerOrdersComponent implements OnInit {
  private readonly orders = inject(OrderService);
  private readonly products = inject(ProductService);
  private readonly toast = inject(ToastService);
  private readonly api = inject(ApiClient);
  private readonly shell = inject(SellerShellService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly user = inject(AuthService).getStoredUser();

  protected readonly statusLabel = ORDER_STATUS_LABEL;
  protected readonly flow = ORDER_FLOW;
  protected readonly statusFilters = STATUS_FILTERS;

  protected readonly search = signal(this.route.snapshot.queryParamMap.get('q') ?? '');
  protected readonly status = signal<OrderStatus | 'ALL'>('ALL');
  protected readonly all = signal<SellerOrderView[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly updatingId = signal<string | null>(null);
  private productIds: string[] = [];

  /** Orders matching the search; the tabs count within these. */
  private readonly searched = computed(() => this.all().filter((v) => matchesOrder(v, this.search())));
  protected readonly views = computed(() =>
    this.status() === 'ALL' ? this.searched() : this.searched().filter((v) => v.order.status === this.status()),
  );
  protected readonly counts = computed(() => {
    const counts: Record<string, number> = { ALL: this.searched().length };
    for (const v of this.searched()) counts[v.order.status] = (counts[v.order.status] ?? 0) + 1;
    return counts;
  });
  protected readonly needsAction = computed(
    () => this.all().filter((v) => v.order.status === 'PENDING' || v.order.status === 'CONFIRMED').length,
  );
  protected readonly isFiltered = computed(() => this.status() !== 'ALL' || this.search().trim().length > 0);

  ngOnInit(): void {
    // The topbar search links here with ?q=…
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const q = params.get('q');
      if (q !== null) this.search.set(q);
    });
    this.load();
  }

  protected load(): void {
    if (!this.user) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.products
      .getProductsOwnedBy(this.user.id)
      .pipe(
        switchMap((products) => {
          this.productIds = products.map((p) => p.id);
          return this.orders.sellerOrders(this.productIds);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (views) => {
          this.all.set(views);
          this.shell.setOrders(views);
        },
        error: (error) => this.errorMessage.set(this.api.getErrorMessage(error, 'Orders could not be loaded.')),
      });
  }

  protected setStatus(value: OrderStatus | 'ALL'): void {
    this.status.set(value);
  }

  protected clearFilters(): void {
    this.status.set('ALL');
    this.search.set('');
  }

  protected nextAction(status: OrderStatus): string | null {
    return nextSellerStatus(status) ? (NEXT_ACTION[status] ?? null) : null;
  }

  protected stepIndex(status: OrderStatus): number {
    return ORDER_FLOW.indexOf(status);
  }

  protected units(view: SellerOrderView): number {
    return view.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  protected advance(view: SellerOrderView): void {
    if (this.updatingId()) return;
    this.updatingId.set(view.order.id);
    this.orders
      .advanceStatus(view.order.id, this.productIds)
      .pipe(finalize(() => this.updatingId.set(null)))
      .subscribe({
        next: (updated) => {
          this.all.update((list) => list.map((v) => (v.order.id === updated.id ? { ...v, order: updated } : v)));
          this.shell.setOrders(this.all());
          this.toast.success(`${updated.reference} is now ${ORDER_STATUS_LABEL[updated.status].toLowerCase()}.`);
        },
        error: (error) => {
          this.toast.error(this.api.getErrorMessage(error, 'The order could not be updated.'));
          this.load();
        },
      });
  }
}
