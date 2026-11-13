import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { SellerStats } from '../../../core/models/commerce.models';
import { IconComponent } from '../../../shared/icon/icon.component';
import { OrderService } from '../../../shared/services/order.service';
import { ProductService } from '../../../shared/services/product-service';
import { AuthService } from '../../auth/auth.service';

/** Seller analytics: revenue, units, orders and best sellers. */
@Component({
  selector: 'app-seller-sales',
  imports: [RouterLink, CurrencyPipe, IconComponent],
  templateUrl: './seller-sales.html',
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
    if (!user) return;
    this.products
      .getProductsOwnedBy(user.id)
      .pipe(switchMap((products) => this.orders.sellerStats(products.map((p) => p.id))))
      .subscribe({
        next: (stats) => {
          this.stats.set(stats);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.api.getErrorMessage(error, 'Sales could not be loaded.'));
          this.isLoading.set(false);
        },
      });
  }
}
