import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiClient } from '../../../core/api/api-client.service';
import { BuyerStats } from '../../../core/models/commerce.models';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { OrderService } from '../../../shared/services/order.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-account',
  imports: [RouterLink, CurrencyPipe, NavbarComponent, FooterComponent, IconComponent],
  templateUrl: './account.html',
})
export class AccountComponent implements OnInit {
  private readonly orders = inject(OrderService);
  private readonly api = inject(ApiClient);
  protected readonly user = inject(AuthService).getStoredUser();

  protected readonly stats = signal<BuyerStats | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  /** Largest quantity, used to scale the bars. */
  protected readonly topQuantity = computed(() =>
    Math.max(1, ...(this.stats()?.topProducts.map((p) => p.quantity) ?? [1])),
  );

  protected readonly initials = (this.user?.name ?? 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  ngOnInit(): void {
    this.orders.buyerStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.api.getErrorMessage(error, 'Your summary could not be loaded.'));
        this.isLoading.set(false);
      },
    });
  }
}
