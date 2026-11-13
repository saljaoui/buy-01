import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { SHIPPING_FEE } from '../../../core/models/commerce.models';
import { controlError, notBlank, showError } from '../../../shared/forms/form-errors';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { CartService } from '../../../shared/services/cart.service';
import { OrderService } from '../../../shared/services/order.service';
import { ToastService } from '../../../shared/services/toast-service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, NavbarComponent, FooterComponent, IconComponent],
  templateUrl: './checkout.html',
})
export class CheckoutComponent implements OnInit {
  protected readonly cart = inject(CartService);
  private readonly orders = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly api = inject(ApiClient);
  private readonly fb = inject(FormBuilder);

  protected readonly shippingFee = SHIPPING_FEE;
  protected readonly isPlacing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, notBlank, Validators.maxLength(80)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9 ()-]{7,20}$/)]],
    street: ['', [Validators.required, notBlank, Validators.maxLength(120)]],
    city: ['', [Validators.required, notBlank, Validators.maxLength(60)]],
    postalCode: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9 -]{3,10}$/)]],
    notes: ['', Validators.maxLength(200)],
    paymentMethod: ['PAY_ON_DELIVERY' as const, Validators.required],
  });

  protected readonly showError = showError;
  private readonly labels: Record<string, string> = {
    fullName: 'Full name',
    phone: 'Phone number',
    street: 'Street address',
    city: 'City',
    postalCode: 'Postal code',
    notes: 'Delivery notes',
  };

  protected err(name: string): string {
    const control = this.form.get(name);
    if (control?.hasError('pattern')) {
      return name === 'phone' ? 'Enter a phone number the courier can call.' : 'Enter a valid postal code.';
    }
    return controlError(control, this.labels[name] ?? name);
  }

  ngOnInit(): void {
    if (this.cart.isEmpty()) {
      void this.router.navigate(['/cart']);
      return;
    }
    const user = this.auth.getStoredUser();
    if (user) this.form.patchValue({ fullName: user.name });
  }

  protected placeOrder(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isPlacing() || this.cart.isEmpty()) return;

    const { paymentMethod, notes, ...address } = this.form.getRawValue();
    const lines = this.cart.items();

    this.isPlacing.set(true);
    this.errorMessage.set(null);

    this.orders
      .placeOrder(
        {
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          address: { ...trimAll(address), notes: notes.trim() || undefined },
          paymentMethod,
        },
        lines.map((l) => ({ productId: l.productId, name: l.name, price: l.price, quantity: l.quantity, imageUrl: l.imageUrl })),
      )
      .pipe(finalize(() => this.isPlacing.set(false)))
      .subscribe({
        next: (order) => {
          this.cart.clear();
          this.toast.success(`Order ${order.reference} placed.`);
          void this.router.navigate(['/orders', order.id], { queryParams: { placed: 1 } });
        },
        error: (error) => {
          this.errorMessage.set(this.api.getErrorMessage(error, 'Your order could not be placed. Please try again.'));
        },
      });
  }
}

function trimAll<T extends Record<string, string>>(value: T): T {
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v.trim()])) as T;
}
