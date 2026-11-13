import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { ORDER_STATUS_LABEL, OrderStatus, nextSellerStatus } from '../../../core/models/commerce.models';
import { IconComponent } from '../../../shared/icon/icon.component';
import { OrderService, SellerOrderView } from '../../../shared/services/order.service';
import { ProductService } from '../../../shared/services/product-service';
import { ToastService } from '../../../shared/services/toast-service';
import { AuthService } from '../../auth/auth.service';
import { STATUS_FILTERS } from '../../shop/orders/order-list.component';
import { SellerSidebarComponent } from '../seller-sidebar/seller-sidebar.component';

const NEXT_ACTION: Partial<Record<OrderStatus, string>> = {
  PENDING: 'Confirm',
  CONFIRMED: 'Mark shipped',
  SHIPPED: 'Mark delivered',
};

@Component({
  selector: 'app-seller-orders',
  imports: [RouterLink, ReactiveFormsModule, CurrencyPipe, DatePipe, SellerSidebarComponent, IconComponent],
  templateUrl: './seller-orders.html',
})
export class SellerOrdersComponent implements OnInit {
  private readonly orders = inject(OrderService);
  private readonly products = inject(ProductService);
  private readonly toast = inject(ToastService);
  private readonly api = inject(ApiClient);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly user = inject(AuthService).getStoredUser();

  protected readonly statusLabel = ORDER_STATUS_LABEL;
  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly status = signal<OrderStatus | 'ALL'>('ALL');

  protected readonly views = signal<SellerOrderView[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly updatingId = signal<string | null>(null);
  private productIds: string[] = [];

  protected readonly openCount = computed(
    () => this.views().filter((v) => v.order.status === 'PENDING' || v.order.status === 'CONFIRMED').length,
  );

  protected readonly initials = (this.user?.name ?? 'S')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  ngOnInit(): void {
    if (!this.user) return;
    this.products.getProductsOwnedBy(this.user.id).subscribe({
      next: (products) => {
        this.productIds = products.map((p) => p.id);
        this.load();
      },
      error: (error) => {
        this.errorMessage.set(this.api.getErrorMessage(error, 'Your products could not be loaded.'));
        this.isLoading.set(false);
      },
    });
    this.search.valueChanges.pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  protected setStatus(value: OrderStatus | 'ALL'): void {
    this.status.set(value);
    this.load();
  }

  protected nextAction(status: OrderStatus): string | null {
    return nextSellerStatus(status) ? (NEXT_ACTION[status] ?? null) : null;
  }

  protected units(view: SellerOrderView): number {
    return view.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  protected advance(view: SellerOrderView): void {
    if (this.updatingId()) return;
    this.updatingId.set(view.order.id);
    this.orders.advanceStatus(view.order.id, this.productIds).subscribe({
      next: (updated) => {
        this.updatingId.set(null);
        this.toast.success(`${updated.reference} is now ${ORDER_STATUS_LABEL[updated.status].toLowerCase()}.`);
        this.load();
      },
      error: (error) => {
        this.updatingId.set(null);
        this.toast.error(this.api.getErrorMessage(error, 'The order could not be updated.'));
        this.load();
      },
    });
  }

  protected load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.orders.sellerOrders(this.productIds, { q: this.search.value, status: this.status() }).subscribe({
      next: (views) => {
        this.views.set(views);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.api.getErrorMessage(error, 'Orders could not be loaded.'));
        this.isLoading.set(false);
      },
    });
  }
}
