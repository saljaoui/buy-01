import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';
import { controlError, notBlank, showError } from '../../../shared/forms/form-errors';
import { IconComponent } from '../../../shared/icon/icon.component';
import { SellerSidebarComponent } from '../seller-sidebar/seller-sidebar.component';
import { SellerSalesComponent } from '../sales/seller-sales.component';

@Component({
  selector: 'app-seller-profile',
  imports: [CommonModule, SellerSidebarComponent, ReactiveFormsModule, IconComponent, SellerSalesComponent],
  templateUrl: './seller-profile.component.html',
  styleUrl: './seller-profile.component.scss',
})
export class SellerProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);

  user = signal<User | null>(null);
  // Same rules as the backend UpdateUserRequest (@NotBlank, @Size(min = 2, max = 50)).
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank, Validators.minLength(2), Validators.maxLength(50)]],
  });
  protected readonly showError = showError;
  err(name: string): string {
    return controlError(this.form.get(name), 'Name');
  }
  isSaving = signal(false);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  userInitials = computed(() => this.getInitials(this.user()?.name ?? ''));
  displayName = computed(() => this.user()?.name ?? 'Unknown');
  displayEmail = computed(() => this.user()?.email ?? '');
  displayRole = computed(() => this.user()?.role ?? 'SELLER');

  ngOnInit(): void {
    this.loadUser();
  }

  loadUser(): void {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.user.set(user);
        this.form.reset({ name: user.name });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(this.authService.getErrorMessage(err, 'Failed to load profile.'));
        this.isLoading.set(false);
      },
    });
  }

  saveChanges(): void {
    if (!this.user() || this.isSaving()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.successMessage.set(null);
      return;
    }

    const trimmedName = this.form.getRawValue().name.trim();
    this.isSaving.set(true);
    this.form.disable();
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.userService
      .updateCurrentUser({ name: trimmedName, avatar: this.user()!.avatar })
      .subscribe({
        next: (updatedUser) => {
          this.user.set(updatedUser);
          this.form.enable();
          this.form.reset({ name: updatedUser.name });
          this.authService.updateStoredUser(updatedUser);
          this.successMessage.set('Profile updated successfully.');
          this.isSaving.set(false);
        },
        error: (err) => {
          this.form.enable();
          this.errorMessage.set(this.authService.getErrorMessage(err, 'Failed to update profile.'));
          this.isSaving.set(false);
        },
      });
  }

  private getInitials(name: string): string {
    if (!name) return 'U';
    return (
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'U'
    );
  }
}
