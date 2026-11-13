import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { ORDER_STATUS_LABEL, Order, OrderStatus } from '../../../core/models/commerce.models';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { OrderService } from '../../../shared/services/order.service';

export const STATUS_FILTERS: { value: OrderStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Placed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SHIPPED', label: 'On the way' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

@Component({
  selector: 'app-order-list',
  imports: [RouterLink, ReactiveFormsModule, CurrencyPipe, DatePipe, NavbarComponent, FooterComponent, IconComponent],
  templateUrl: './order-list.html',
})
export class OrderListComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly api = inject(ApiClient);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statusLabel = ORDER_STATUS_LABEL;
  protected readonly statusFilters = STATUS_FILTERS;

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly status = signal<OrderStatus | 'ALL'>('ALL');

  protected readonly orders = signal<Order[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  /** True once the buyer has at least one order (so an empty filter result isn't shown as "no orders yet"). */
  protected readonly hasAnyOrder = signal(false);

  ngOnInit(): void {
    this.load();
    this.search.valueChanges.pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  protected setStatus(value: OrderStatus | 'ALL'): void {
    this.status.set(value);
    this.load();
  }

  protected itemCount(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  protected load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.orderService.myOrders({ q: this.search.value, status: this.status() }).subscribe({
      next: (orders) => {
        this.orders.set(orders);
        if (orders.length > 0) this.hasAnyOrder.set(true);
        else if (this.status() === 'ALL' && !this.search.value.trim()) this.hasAnyOrder.set(false);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.api.getErrorMessage(error, 'Your orders could not be loaded.'));
        this.isLoading.set(false);
      },
    });
  }
}
