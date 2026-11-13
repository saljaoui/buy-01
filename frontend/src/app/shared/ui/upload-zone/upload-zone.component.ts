import { Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';

import { IconComponent } from '../../icon/icon.component';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Checks one file; returns why it was rejected, or null. */
export function rejectReason(file: File, types: string[], maxBytes: number): string | null {
  if (!types.includes(file.type)) return `${file.name}: only JPG, PNG, WEBP or AVIF images.`;
  if (file.size > maxBytes) return `${file.name}: ${formatBytes(file.size)} is over the ${formatBytes(maxBytes)} limit.`;
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Drag & drop (or click / keyboard) zone for images. Validates type, size and how many
 * more files fit, shows what was rejected, and emits only the valid files.
 */
@Component({
  selector: 'app-upload-zone',
  imports: [IconComponent],
  template: `
    <div class="uz" [class.dragging]="dragging()" [class.disabled]="disabled() || remaining() === 0" [class.compact]="compact()"
      role="button" tabindex="0" [attr.aria-disabled]="disabled() || remaining() === 0"
      [attr.aria-describedby]="'uz-hint-' + uid" (click)="pick()" (keydown.enter)="pick()" (keydown.space)="$event.preventDefault(); pick()"
      (dragover)="onDragOver($event)" (dragleave)="dragging.set(false)" (drop)="onDrop($event)" data-testid="upload-zone">
      <span class="uz-icon" aria-hidden="true"><app-icon name="upload-cloud" [size]="compact() ? 20 : 26"></app-icon></span>
      <span class="uz-copy">
        <strong>{{ remaining() === 0 ? limitTitle() : dragging() ? 'Drop to add' : title() }}</strong>
        <span [id]="'uz-hint-' + uid">{{ remaining() === 0 ? limitHint() : hint() }}</span>
      </span>
      <input #input class="uz-input" type="file" [accept]="types().join(',')" [multiple]="maxFiles() > 1"
        (change)="onInputChange($event)" tabindex="-1" aria-hidden="true" />
    </div>
    @if (errors().length) {
      <ul class="uz-errors" role="alert" data-testid="upload-errors">
        @for (e of errors(); track $index) {
          <li><app-icon name="alert" [size]="14"></app-icon>{{ e }}</li>
        }
      </ul>
    }
  `,
  styleUrl: './upload-zone.component.scss',
})
export class UploadZoneComponent {
  private static nextId = 0;
  protected readonly uid = UploadZoneComponent.nextId++;
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');

  readonly types = input<string[]>(IMAGE_TYPES);
  readonly maxBytes = input(MAX_IMAGE_BYTES);
  /** How many more files can be added (Infinity = no limit). */
  readonly maxFiles = input(Infinity);
  readonly disabled = input(false);
  readonly compact = input(false);
  readonly title = input('Drag photos here, or click to browse');
  readonly hint = input('JPG, PNG, WEBP or AVIF · up to 2 MB each');
  readonly limitTitle = input('Photo limit reached');
  readonly limitHint = input('Remove a photo to add another.');

  readonly files = output<File[]>();

  protected readonly dragging = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly remaining = computed(() => Math.max(0, this.maxFiles()));

  pick(): void {
    if (this.disabled() || this.remaining() === 0) return;
    this.input()?.nativeElement.click();
  }

  clearErrors(): void {
    this.errors.set([]);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled()) this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    if (this.disabled()) return;
    this.accept(Array.from(event.dataTransfer?.files ?? []));
  }

  protected onInputChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.accept(Array.from(el.files ?? []));
    el.value = '';
  }

  /** Public so tests (and callers) can feed files directly. */
  accept(files: File[]): void {
    if (files.length === 0) return;
    const errors: string[] = [];
    const valid: File[] = [];
    for (const file of files) {
      const reason = rejectReason(file, this.types(), this.maxBytes());
      if (reason) errors.push(reason);
      else valid.push(file);
    }
    const room = this.remaining();
    if (valid.length > room) {
      errors.push(`Only ${room} more ${room === 1 ? 'photo fits' : 'photos fit'}; ${valid.length - room} skipped.`);
      valid.splice(room);
    }
    this.errors.set(errors);
    if (valid.length) this.files.emit(valid);
  }
}
