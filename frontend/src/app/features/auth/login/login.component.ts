import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { UserRole } from '../auth.models';
import { AuthService } from '../auth.service';

type ToastKind = 'error' | 'success';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent implements OnDestroy {
  protected readonly form = {
    login: '',
    password: '',
    rememberMe: true,
  };

  protected selectedRole: UserRole = 'CLIENT';
  protected passwordVisible = false;
  protected submitted = false;
  protected isSubmitting = false;
  protected toastVisible = false;
  protected toastMessage = 'Invalid credentials.';
  protected toastType: ToastKind = 'error';

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  protected selectRole(role: UserRole): void {
    this.selectedRole = role;
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  protected submit(): void {
    this.submitted = true;

    if (this.isSubmitting || this.isLoginInvalid || this.isPasswordInvalid) {
      return;
    }

    this.hideToast();
    this.isSubmitting = true;

    this.authService
      .login({
        login: this.form.login.trim(),
        password: this.form.password,
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          this.authService.storeSession(response, this.form.rememberMe);
          const target = response.role === 'SELLER' ? '/seller' : '/products';
          void this.router.navigate([target]);
        },
        error: (error) => {
          this.showToast(this.authService.getErrorMessage(error, 'Invalid credentials.'));
        },
      });
  }

  protected get passwordInputType(): 'password' | 'text' {
    return this.passwordVisible ? 'text' : 'password';
  }

  protected get isLoginInvalid(): boolean {
    return this.submitted && this.form.login.trim().length === 0;
  }

  protected get isPasswordInvalid(): boolean {
    return this.submitted && this.form.password.length < 8;
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
