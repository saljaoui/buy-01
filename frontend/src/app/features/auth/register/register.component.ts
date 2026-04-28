import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../auth.service';
import { UserRole } from '../../../core/models/user.model';

type RegisterStep = 1 | 2 | 3;
type ToastKind = 'error' | 'success' | 'warning';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent implements OnDestroy {
  protected currentStep: RegisterStep = 1;
  protected selectedRole: UserRole = 'CLIENT';
  protected readonly form = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  };

  protected passwordVisible = false;
  protected confirmPasswordVisible = false;
  protected step2Submitted = false;
  protected finalSubmitted = false;
  protected isSubmitting = false;
  protected toastVisible = false;
  protected toastMessage = 'Something went wrong.';
  protected toastType: ToastKind = 'error';

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  protected selectRole(role: UserRole): void {
    this.selectedRole = role;
  }

  protected goToStep(step: RegisterStep): void {
    if (step === 1) {
      this.currentStep = 1;
      return;
    }

    if (step === 2) {
      this.currentStep = 2;
      return;
    }

    this.step2Submitted = true;

    if (this.hasStep2Errors) {
      this.showToast('Please fix the highlighted fields before continuing.', 'warning');
      return;
    }

    this.currentStep = 3;
  }

  protected togglePassword(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.passwordVisible = !this.passwordVisible;
      return;
    }

    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  protected submit(): void {
    this.step2Submitted = true;
    this.finalSubmitted = true;

    if (this.hasStep2Errors) {
      this.currentStep = 2;
      this.showToast('Please complete your account details before submitting.', 'warning');
      return;
    }

    if (this.hasFinalStepErrors || this.isSubmitting) {
      this.showToast('Please complete the remaining required fields.', 'warning');
      return;
    }

    this.hideToast();
    this.isSubmitting = true;

    this.authService
      .register({
        name: this.form.name.trim(),
        email: this.form.email.trim(),
        password: this.form.password,
        role: this.selectedRole,
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.showToast('Account created successfully. Redirecting to sign in.', 'success');

          if (this.redirectTimer) {
            clearTimeout(this.redirectTimer);
          }

          this.redirectTimer = setTimeout(() => {
            void this.router.navigate(['/login']);
          }, 1200);
        },
        error: (error) => {
          this.showToast(
            this.authService.getErrorMessage(error, 'Unable to create your account.'),
            'error',
          );
        },
      });
  }

  protected get passwordInputType(): 'password' | 'text' {
    return this.passwordVisible ? 'text' : 'password';
  }

  protected get confirmPasswordInputType(): 'password' | 'text' {
    return this.confirmPasswordVisible ? 'text' : 'password';
  }

  protected get isNameInvalid(): boolean {
    return this.step2Submitted && this.form.name.trim().length === 0;
  }

  protected get isEmailInvalid(): boolean {
    return this.step2Submitted && !EMAIL_PATTERN.test(this.form.email.trim());
  }

  protected get isEmailValid(): boolean {
    return this.step2Submitted && EMAIL_PATTERN.test(this.form.email.trim());
  }

  protected get isPasswordInvalid(): boolean {
    return this.step2Submitted && this.form.password.length < 8;
  }

  protected get isConfirmPasswordInvalid(): boolean {
    return (
      this.step2Submitted &&
      (this.form.confirmPassword.length === 0 || this.form.confirmPassword !== this.form.password)
    );
  }

  protected get passwordStrength(): {
    visible: boolean;
    width: string;
    color: string;
    label: string;
  } {
    const password = this.form.password;

    if (password.length === 0) {
      return {
        visible: false,
        width: '0%',
        color: 'var(--error)',
        label: 'Too short',
      };
    }

    if (password.length < 8) {
      return {
        visible: true,
        width: '25%',
        color: 'var(--error)',
        label: 'Too short',
      };
    }

    let score = 1;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      score += 1;
    }

    if (/\d/.test(password)) {
      score += 1;
    }

    if (/[^\w\s]/.test(password)) {
      score += 1;
    }

    if (password.length >= 8) {
      score += 1;
    }

    if (score <= 2) {
      return {
        visible: true,
        width: '40%',
        color: 'var(--warning)',
        label: 'Weak',
      };
    }

    if (score === 3) {
      return {
        visible: true,
        width: '65%',
        color: 'var(--warning)',
        label: 'Fair',
      };
    }

    if (score === 4) {
      return {
        visible: true,
        width: '82%',
        color: 'var(--gold)',
        label: 'Good',
      };
    }

    return {
      visible: true,
      width: '100%',
      color: 'var(--success)',
      label: 'Strong',
    };
  }

  protected get hasStep2Errors(): boolean {
    return (
      this.isNameInvalid ||
      this.isEmailInvalid ||
      this.isPasswordInvalid ||
      this.isConfirmPasswordInvalid
    );
  }

  protected get hasFinalStepErrors(): boolean {
    return !this.form.terms;
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
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
