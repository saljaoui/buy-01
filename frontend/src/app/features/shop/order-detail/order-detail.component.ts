import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import {
  ORDER_FLOW,
  ORDER_STATUS_LABEL,
  Order,
  OrderStatus,
  canCancel,
} from '../../../core/models/commerce.models';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { CartService } from '../../../shared/services/cart.service';
import { OrderService } from '../../../shared/services/order.service';
import { ProductService } from '../../../shared/services/product-service';
import { ToastService } from '../../../shared/services/toast-service';

interface TimelineStep {
  status: OrderStatus;
  label: string;
  at: string | null;
  state: 'done' | 'current' | 'todo';
}

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, CurrencyPipe, DatePipe, NavbarComponent, FooterComponent, IconComponent],
  templateUrl: './order-detail.html',
})
export class OrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orders = inject(OrderService);
  private readonly products = inject(ProductService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly api = inject(ApiClient);

  protected readonly statusLabel = ORDER_STATUS_LABEL;
  protected readonly order = signal<Order | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly justPlaced = this.route.snapshot.queryParamMap.get('placed') === '1';

  protected readonly confirmingCancel = signal(false);
  protected readonly isCancelling = signal(false);
  protected readonly isReordering = signal(false);

  protected readonly cancellable = computed(() => {
    const order = this.order();
    return !!order && canCancel(order.status);
  });

  protected readonly timeline = computed<TimelineStep[]>(() => {
    const order = this.order();
    if (!order) return [];
    const reached = (status: OrderStatus) => order.history.find((h) => h.status === status)?.at ?? null;
    const currentIndex = ORDER_FLOW.indexOf(order.status);
    return ORDER_FLOW.map((status, index) => ({
      status,
      label: ORDER_STATUS_LABEL[status],
      at: reached(status),
      state: order.status === 'CANCELLED'
        ? (reached(status) ? 'done' : 'todo')
        : index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo',
    }));
  });

  protected readonly cancelledAt = computed(
    () => this.order()?.history.find((h) => h.status === 'CANCELLED')?.at ?? null,
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigate(['/orders']);
      return;
    }
    this.orders.getOrder(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.api.getErrorMessage(error, 'This order could not be loaded.'));
        this.isLoading.set(false);
      },
    });
  }

  protected itemCount(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  protected cancel(): void {
    const order = this.order();
    if (!order || this.isCancelling()) return;
    this.isCancelling.set(true);
    this.orders
      .cancelOrder(order.id)
      .pipe(finalize(() => this.isCancelling.set(false)))
      .subscribe({
        next: (updated) => {
          this.order.set(updated);
          this.confirmingCancel.set(false);
          this.toast.success(`Order ${updated.reference} cancelled.`);
        },
        error: (error) => {
          this.confirmingCancel.set(false);
          this.toast.error(this.api.getErrorMessage(error, 'The order could not be cancelled.'));
        },
      });
  }

  /** "Order again": puts the same items back in the cart, using today's stock and price. */
  protected reorder(): void {
    const order = this.order();
    if (!order || this.isReordering()) return;
    this.isReordering.set(true);

    forkJoin(order.items.map((item) => this.products.getProduct(item.productId).pipe(catchError(() => of(null)))))
      .pipe(finalize(() => this.isReordering.set(false)))
      .subscribe((current) => {
        let added = 0;
        let unavailable = 0;
        order.items.forEach((item, index) => {
          const product = current[index];
          if (!product || product.quantity <= 0) {
            unavailable++;
            return;
          }
          this.cart.add(
            { productId: product.id, name: product.name, price: product.price, stock: product.quantity, imageUrl: item.imageUrl },
            Math.min(item.quantity, product.quantity),
          );
          added++;
        });

        if (added === 0) {
          this.toast.error('None of these items are available right now.');
          return;
        }
        if (unavailable > 0) {
          this.toast.warning(`${unavailable} ${unavailable === 1 ? 'item is' : 'items are'} no longer available and were skipped.`);
        }
        void this.router.navigate(['/cart']);
      });
  }
}
