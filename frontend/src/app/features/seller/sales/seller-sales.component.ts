import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { SellerStats } from '../../../core/models/commerce.models';
import { IconComponent } from '../../../shared/icon/icon.component';
import { OrderService } from '../../../shared/services/order.service';
import { ProductService } from '../../../shared/services/product-service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { StatCardComponent } from '../../../shared/ui/stat-card/stat-card.component';
import { AuthService } from '../../auth/auth.service';

/** Seller analytics: revenue, units, orders (the dashboard's stat cards) and best sellers. */
@Component({
  selector: 'app-seller-sales',
  imports: [RouterLink, CurrencyPipe, IconComponent, StatCardComponent, EmptyStateComponent],
  templateUrl: './seller-sales.html',
  styleUrl: './seller-sales.scss',
})
export class SellerSalesComponent implements OnInit {
  private readonly orders = inject(OrderService);
  private readonly products = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiClient);

  protected readonly stats = signal<SellerStats | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly topQuantity = computed(() =>
    Math.max(1, ...(this.stats()?.bestSellers.map((p) => p.quantity) ?? [1])),
  );

  ngOnInit(): void {
    const user = this.auth.getStoredUser();
    if (!user) {
      this.isLoading.set(false);
      return;
    }
    this.products
      .getProductsOwnedBy(user.id)
      .pipe(
        switchMap((products) => this.orders.sellerStats(products.map((p) => p.id))),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (stats) => this.stats.set(stats),
        error: (error) => this.errorMessage.set(this.api.getErrorMessage(error, 'Sales could not be loaded.')),
      });
  }
}
