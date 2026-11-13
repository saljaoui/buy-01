import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';

import { IconComponent } from '../../icon/icon.component';
import { ConfirmService } from './confirm.service';

/** Renders ConfirmService requests in a native <dialog> (focus trap + Esc for free). Mounted once in the app root. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [IconComponent],
  template: `
    <dialog #dialog class="confirm-dialog" (close)="confirm.answer(false)" (cancel)="confirm.answer(false)"
      aria-labelledby="confirm-title" aria-describedby="confirm-message">
      @if (confirm.pending(); as p) {
        <div class="cd-body">
          <span class="cd-icon" [class.danger]="p.tone === 'danger'" aria-hidden="true">
            <app-icon [name]="p.tone === 'danger' ? 'trash' : 'info'" [size]="20"></app-icon>
          </span>
          <h2 id="confirm-title">{{ p.title }}</h2>
          @if (p.message) {
            <p id="confirm-message">{{ p.message }}</p>
          }
        </div>
        <div class="cd-actions">
          <button type="button" class="cd-btn" (click)="confirm.answer(false)" data-testid="confirm-cancel">
            {{ p.cancelLabel || 'Cancel' }}
          </button>
          <button type="button" class="cd-btn primary" [class.danger]="p.tone === 'danger'" (click)="confirm.answer(true)"
            data-testid="confirm-ok" autofocus>
            {{ p.confirmLabel || 'Confirm' }}
          </button>
        </div>
      }
    </dialog>
  `,
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog()?.nativeElement;
      if (!el) return;
      const open = !!this.confirm.pending();
      if (open && !el.open && typeof el.showModal === 'function') el.showModal();
      if (!open && el.open && typeof el.close === 'function') el.close();
    });
  }
}
