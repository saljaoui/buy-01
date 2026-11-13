import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../auth.service';
import { UserRole } from '../../../core/models/user.model';
import { controlError, matchFields, notBlank, showError } from '../../../shared/forms/form-errors';
import { IconComponent } from '../../../shared/icon/icon.component';

type RegisterStep = 1 | 2 | 3;
type ToastKind = 'error' | 'success' | 'warning';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent implements OnDestroy {
  // Signals, not plain fields: the app is zoneless, so state changed inside an HTTP
  // callback (spinner, toast, step) only re-renders when it lives in a signal.
  protected readonly currentStep = signal<RegisterStep>(1);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group(
    {
      role: ['CLIENT' as UserRole, Validators.required],
      name: ['', [Validators.required, notBlank, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
    },
    { validators: matchFields('password', 'confirmPassword') },
  );

  /** Fields shown on step 2. Used to validate that step before moving on. */
  private readonly step2Fields = ['name', 'email', 'password', 'confirmPassword'] as const;

  protected readonly showError = showError;
  private readonly labels: Record<string, string> = {
    name: 'Full name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Password confirmation',
    terms: 'Terms',
  };

  protected err(name: string): string {
    if (name === 'confirmPassword' && this.form.controls.confirmPassword.hasError('mismatch')) {
      return "Passwords don't match.";
    }
    if (name === 'terms') {
      return 'You must accept the terms to continue.';
    }
    return controlError(this.form.get(name), this.labels[name] ?? name);
  }

  /** The message to show under a field, or '' when nothing should render (untouched, valid, or no text). */
  protected fieldError(name: string): string {
    return showError(this.form, name) ? this.err(name) : '';
  }

  protected get selectedRole(): UserRole {
    return this.form.controls.role.value;
  }

  protected passwordVisible = false;
  protected confirmPasswordVisible = false;
  protected readonly isSubmitting = signal(false);
  protected readonly toastVisible = signal(false);
  protected readonly toastMessage = signal('Something went wrong.');
  protected readonly toastType = signal<ToastKind>('error');

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  protected selectRole(role: UserRole): void {
    this.form.controls.role.setValue(role);
  }

  protected goToStep(step: RegisterStep): void {
    if (step === 1 || step === 2) {
      this.currentStep.set(step);
      return;
    }

    if (this.hasStep2Errors) {
      this.touchStep2();
      this.showToast('Please fix the highlighted fields before continuing.', 'warning');
      return;
    }

    this.currentStep.set(3);
  }

  protected togglePassword(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.passwordVisible = !this.passwordVisible;
      return;
    }

    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  /** Pressing Enter: go to the next step, or submit on the last one. */
  protected next(): void {
    const step = this.currentStep();
    if (step === 3) {
      this.submit();
    } else {
      this.goToStep(step === 1 ? 2 : 3);
    }
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.hasStep2Errors) {
      this.currentStep.set(2);
      this.showToast('Please complete your account details before submitting.', 'warning');
      return;
    }

    if (this.hasFinalStepErrors || this.isSubmitting()) {
      this.showToast('Please complete the remaining required fields.', 'warning');
      return;
    }

    this.hideToast();
    this.isSubmitting.set(true);

    const { name, email, password, role } = this.form.getRawValue();

    this.authService
      .register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (session) => {
          this.authService.storeSession(session, true);
          this.showToast('Account created successfully. Redirecting to your workspace.', 'success');

          if (this.redirectTimer) {
            clearTimeout(this.redirectTimer);
          }

          this.redirectTimer = setTimeout(() => {
            const target = session.user.role === 'SELLER' ? '/seller' : '/products';
            void this.router.navigate([target]);
          }, 1200);
        },
        error: (error: unknown) => {
          const message = this.authService.getErrorMessage(error, 'Unable to create your account.');

          // Duplicate email: send the user back to step 2 with the message on the email field.
          // The `server` error clears itself as soon as they edit the email.
          if (error instanceof HttpErrorResponse && error.status === 409) {
            const email = this.form.controls.email;
            email.setErrors({ ...(email.errors ?? {}), server: message });
            email.markAsTouched();
            this.currentStep.set(2);
          }

          this.showToast(message, 'error');
        },
      });
  }

  protected get passwordInputType(): 'password' | 'text' {
    return this.passwordVisible ? 'text' : 'password';
  }

  protected get confirmPasswordInputType(): 'password' | 'text' {
    return this.confirmPasswordVisible ? 'text' : 'password';
  }

  protected get isEmailValid(): boolean {
    const email = this.form.controls.email;
    return email.touched && email.valid;
  }

  protected get passwordStrength(): {
    visible: boolean;
    width: string;
    color: string;
    label: string;
  } {
    const password = this.form.controls.password.value;

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
    return this.step2Fields.some((field) => this.form.controls[field].invalid);
  }

  protected get hasFinalStepErrors(): boolean {
    return this.form.controls.terms.invalid;
  }

  private touchStep2(): void {
    this.step2Fields.forEach((field) => this.form.controls[field].markAsTouched());
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
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.toastVisible.set(true);

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastTimer = setTimeout(() => {
      this.toastVisible.set(false);
    }, 3500);
  }

  private hideToast(): void {
    this.toastVisible.set(false);

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }
}
