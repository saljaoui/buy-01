import { Component, ElementRef, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, map, startWith } from 'rxjs';

import { User } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user.service';
import { controlError, notBlank, showError } from '../../../shared/forms/form-errors';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ToastService } from '../../../shared/services/toast-service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { IMAGE_TYPES, formatBytes } from '../../../shared/ui/upload-zone/upload-zone.component';
import { AuthService } from '../../auth/auth.service';
import { SellerSalesComponent } from '../sales/seller-sales.component';
import { SellerShellService } from '../seller-layout/seller-shell.service';

/** The avatar is stored as a small square JPEG in the user's `avatar` text field. */
export const AVATAR_SIZE = 256;
const AVATAR_MAX_INPUT = 8 * 1024 * 1024;

/** Crops the centre square of an image and scales it to `size` px, as a JPEG data URL. */
export function resizeToSquare(file: Blob, size = AVATAR_SIZE): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error('Your browser cannot resize images.'));
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be read.'));
    };
    img.src = url;
  });
}

@Component({
  selector: 'app-seller-profile',
  imports: [ReactiveFormsModule, IconComponent, EmptyStateComponent, SellerSalesComponent],
  templateUrl: './seller-profile.component.html',
  styleUrl: './seller-profile.component.scss',
})
export class SellerProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly shell = inject(SellerShellService);
  private readonly fb = inject(FormBuilder);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('avatarInput');

  readonly user = signal<User | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly isSaving = signal(false);
  /** Avatar upload progress (0..100), null when idle. */
  readonly avatarProgress = signal<number | null>(null);
  readonly avatarError = signal<string | null>(null);

  // Same rules as the backend UpdateUserRequest (@NotBlank, @Size(min = 2, max = 50)).
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank, Validators.minLength(2), Validators.maxLength(50)]],
  });
  private readonly nameValue = toSignal(this.form.controls.name.valueChanges.pipe(startWith(''), map(() => this.form.controls.name.value)), {
    initialValue: '',
  });
  private readonly formStatus = toSignal(this.form.statusChanges.pipe(startWith(this.form.status)), { initialValue: this.form.status });

  protected readonly showError = showError;
  protected err(): string {
    return controlError(this.form.controls.name, 'Name');
  }

  readonly initials = computed(() =>
    (this.user()?.name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'S',
  );
  /** Save only when the name really changed and is valid. */
  readonly canSave = computed(
    () => !this.isSaving() && this.formStatus() === 'VALID' && this.nameValue().trim() !== (this.user()?.name ?? '').trim(),
  );

  ngOnInit(): void {
    this.loadUser();
  }

  loadUser(): void {
    this.errorMessage.set(null);
    this.isLoading.set(true);
    this.userService
      .getCurrentUser()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.form.reset({ name: user.name });
        },
        error: (err) => this.errorMessage.set(this.auth.getErrorMessage(err, 'Your profile could not be loaded.')),
      });
  }

  saveName(): void {
    this.form.markAllAsTouched();
    const user = this.user();
    if (!user || !this.canSave()) return;
    const name = this.form.controls.name.value.trim();
    this.isSaving.set(true);
    this.userService
      .updateCurrentUser({ name, avatar: user.avatar })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (updated) => {
          this.applyUser(updated);
          this.form.reset({ name: updated.name });
          this.toast.success('Profile saved.');
        },
        error: (err) => this.toast.error(this.auth.getErrorMessage(err, 'Your profile could not be saved.')),
      });
  }

  // ---------- Avatar ----------

  pickAvatar(): void {
    if (this.avatarProgress() !== null) return;
    this.fileInput()?.nativeElement.click();
  }

  async onAvatarChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.avatarError.set(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      this.avatarError.set('Choose a JPG, PNG, WEBP or AVIF image.');
      return;
    }
    if (file.size > AVATAR_MAX_INPUT) {
      this.avatarError.set(`That image is ${formatBytes(file.size)}; choose one under ${formatBytes(AVATAR_MAX_INPUT)}.`);
      return;
    }
    this.avatarProgress.set(0);
    try {
      this.uploadAvatar(await resizeToSquare(file));
    } catch (e) {
      this.avatarProgress.set(null);
      this.avatarError.set(e instanceof Error ? e.message : 'This image could not be used.');
    }
  }

  removeAvatar(): void {
    if (!this.user()?.avatar || this.avatarProgress() !== null) return;
    this.avatarProgress.set(0);
    this.uploadAvatar('', 'Profile photo removed.');
  }

  /** `avatar: ''` clears it (the backend stores null). */
  private uploadAvatar(avatar: string, message = 'Profile photo updated.'): void {
    const user = this.user();
    if (!user) return;
    this.userService
      .updateCurrentUserWithProgress({ name: user.name, avatar })
      .pipe(finalize(() => this.avatarProgress.set(null)))
      .subscribe({
        next: (e) => {
          if (e.type === 'progress') {
            this.avatarProgress.set(e.percent);
            return;
          }
          this.avatarProgress.set(100);
          this.applyUser(e.user);
          this.toast.success(message);
        },
        error: (err) => this.avatarError.set(this.auth.getErrorMessage(err, 'The photo could not be saved.')),
      });
  }

  private applyUser(updated: User): void {
    this.user.set(updated);
    this.auth.updateStoredUser(updated);
    this.shell.profileChanged();
  }
}
