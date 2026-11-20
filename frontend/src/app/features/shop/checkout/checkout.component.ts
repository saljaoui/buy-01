import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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

type Step = 1 | 2 | 3;

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

  /** Wizard state: which step is visible. */
  protected readonly steps: ReadonlyArray<{ n: Step; label: string }> = [
    { n: 1, label: 'Address' },
    { n: 2, label: 'Review' },
    { n: 3, label: 'Confirm' },
  ];
  protected readonly step = signal<Step>(1);

  /** Text of the main button in the order summary, per step. */
  protected readonly submitLabel = computed(() => {
    if (this.isPlacing()) return 'Placing order...';
    return { 1: 'Continue to review', 2: 'Continue to payment', 3: 'Place order' }[this.step()];
  });

  protected readonly total = computed(() => this.cart.subtotal() + this.shippingFee);

  /** Fields validated before leaving step 1. */
  private readonly addressFields = ['fullName', 'phone', 'street', 'city', 'postalCode', 'notes'] as const;

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

  /** Read-only copy of the form for the review step. */
  protected get preview() {
    return this.form.getRawValue();
  }

  /** One submit handler: Enter key and the summary button both land here. */
  protected onSubmit(): void {
    if (this.step() === 3) this.placeOrder();
    else this.next();
  }

  protected next(): void {
    if (this.step() === 1 && !this.addressIsValid()) return;
    if (this.step() < 3) this.moveTo((this.step() + 1) as Step);
  }

  protected back(): void {
    if (this.step() > 1) this.moveTo((this.step() - 1) as Step);
  }

  /** Clicking a step in the stepper: only backwards (forward must pass validation). */
  protected goTo(s: Step): void {
    if (s < this.step()) this.moveTo(s);
  }

  private moveTo(s: Step): void {
    this.errorMessage.set(null);
    this.step.set(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private addressIsValid(): boolean {
    let valid = true;
    for (const name of this.addressFields) {
      const c = this.form.controls[name];
      c.markAsTouched();
      if (c.invalid) valid = false;
    }
    return valid;
  }

  protected placeOrder(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.moveTo(1);
      return;
    }
    if (this.isPlacing() || this.cart.isEmpty()) return;

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