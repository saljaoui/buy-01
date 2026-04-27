import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SellerNavComponent } from '../seller-nav/seller-nav.component';
import { AuthService } from '../../auth/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AuthUser } from '../../auth/auth.models';

@Component({
  selector: 'app-seller-profile',
  imports: [CommonModule, SellerNavComponent, FormsModule],
  templateUrl: './seller-profile.component.html',
  styleUrl: './seller-profile.component.scss',
})
export class SellerProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  user: AuthUser | null = null;
  editableName = '';
  isLoading = false;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  ngOnInit(): void {
    this.loadUser();
  }

  loadUser(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.user = user;
        this.editableName = user.name;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = this.authService.getErrorMessage(err, 'Failed to load profile.');
        this.isLoading = false;

        // Fallback to stored user if backend fails
        const stored = this.authService.getStoredUser();
        if (stored) {
          this.user = stored;
          this.editableName = stored.name;
        }
      },
    });
  }

  saveChanges(): void {
    if (!this.user || this.isSaving) {
      return;
    }

    const trimmedName = this.editableName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      this.errorMessage = 'Name must be at least 2 characters.';
      this.successMessage = null;
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.userService
      .updateCurrentUser({
        name: trimmedName,
        avatar: this.user.avatar,
      })
      .subscribe({
        next: (updatedUser) => {
          this.user = updatedUser;
          this.editableName = updatedUser.name;
          this.authService.updateStoredUser(updatedUser);
          this.successMessage = 'Profile updated successfully.';
          this.isSaving = false;
        },
        error: (err) => {
          this.errorMessage = this.authService.getErrorMessage(err, 'Failed to update profile.');
          this.isSaving = false;
        },
      });
  }

  get userInitials(): string {
    return this.getInitials(this.user?.name ?? '');
  }

  get displayName(): string {
    return this.user?.name ?? 'Unknown';
  }

  get displayEmail(): string {
    return this.user?.email ?? '';
  }

  get displayRole(): string {
    return this.user?.role ?? 'SELLER';
  }

  private getInitials(name: string): string {
    if (!name) {
      return 'U';
    }

    const initials = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    return initials || 'U';
  }
}

