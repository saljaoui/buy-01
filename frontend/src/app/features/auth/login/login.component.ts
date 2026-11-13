import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../auth.service';
import { controlError, showError } from '../../../shared/forms/form-errors';
import { resolveHomePath, safeReturnUrl } from '../../../core/guards/auth.guards';
import { IconComponent } from '../../../shared/icon/icon.component';

type ToastKind = 'error' | 'success';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [true],
  });

  protected readonly showError = showError;
  protected readonly labels: Record<string, string> = { email: 'Email', password: 'Password' };
  protected err(name: string): string {
    return controlError(this.form.get(name), this.labels[name] ?? name);
  }

  protected passwordVisible = false;
  protected isSubmitting = false;
  protected toastVisible = false;
  protected toastMessage = 'Invalid credentials.';
  protected toastType: ToastKind = 'error';

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  protected togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  protected submit(): void {
    // Mark every field as touched so all inline errors appear at once.
    this.form.markAllAsTouched();

    if (this.isSubmitting || this.form.invalid) {
      return;
    }

    const { email, password, rememberMe } = this.form.getRawValue();

    this.hideToast();
    this.isSubmitting = true;

    this.authService
      .login({
        email: email.trim(),
        password,
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (session) => {
          this.authService.storeSession(session, rememberMe);
          const returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
          void this.router.navigateByUrl(returnUrl ?? resolveHomePath(session.user));
        },
        error: (error) => {
          this.showToast(this.authService.getErrorMessage(error, 'Invalid credentials.'));
        },
      });
  }

  protected get passwordInputType(): 'password' | 'text' {
    return this.passwordVisible ? 'text' : 'password';
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  private showToast(message: string, type: ToastKind = 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
    }, 3500);
  }

  private hideToast(): void {
    this.toastVisible = false;

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }
}
