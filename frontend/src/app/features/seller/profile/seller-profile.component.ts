import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SellerNavComponent } from '../seller-nav/seller-nav.component';
import { AuthService } from '../../auth/auth.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-seller-profile',
  imports: [CommonModule, SellerNavComponent, FormsModule],
  templateUrl: './seller-profile.component.html',
  styleUrl: './seller-profile.component.scss',
})
export class SellerProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  user = signal<User | null>(null);
  editableName = signal('');
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
        this.editableName.set(user.name);
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

    const trimmedName = this.editableName().trim();
    if (!trimmedName || trimmedName.length < 2) {
      this.errorMessage.set('Name must be at least 2 characters.');
      this.successMessage.set(null);
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.userService
      .updateCurrentUser({ name: trimmedName, avatar: this.user()!.avatar })
      .subscribe({
        next: (updatedUser) => {
          this.user.set(updatedUser);
          this.editableName.set(updatedUser.name);
          this.authService.updateStoredUser(updatedUser);
          this.successMessage.set('Profile updated successfully.');
          this.isSaving.set(false);
        },
        error: (err) => {
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