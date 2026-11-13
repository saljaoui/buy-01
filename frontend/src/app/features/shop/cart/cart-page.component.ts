import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CartItem, SHIPPING_FEE } from '../../../core/models/commerce.models';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { CartService } from '../../../shared/services/cart.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-cart-page',
  imports: [RouterLink, CurrencyPipe, NavbarComponent, FooterComponent, IconComponent],
  templateUrl: './cart-page.html',
})
export class CartPageComponent {
  protected readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly shippingFee = SHIPPING_FEE;
  /** The last removed line, so the buyer can undo. */
  protected readonly lastRemoved = signal<CartItem | null>(null);
  protected readonly isSeller = this.auth.getStoredUser()?.role === 'SELLER';

  protected setQuantity(item: CartItem, quantity: number): void {
    this.cart.update(item.productId, quantity);
  }

  protected remove(item: CartItem): void {
    this.lastRemoved.set(this.cart.remove(item.productId) ?? null);
  }

  protected undo(): void {
    const item = this.lastRemoved();
    if (item) this.cart.restore(item);
    this.lastRemoved.set(null);
  }

  protected checkout(): void {
    // Guests sign in first and come straight back to checkout.
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    void this.router.navigate(['/checkout']);
  }
}
