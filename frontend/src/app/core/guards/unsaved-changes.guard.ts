import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

import { ConfirmService } from '../../shared/ui/confirm/confirm.service';

/** A page that can tell whether leaving would lose work. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Asks before leaving a page with unsaved changes. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component?.hasUnsavedChanges?.()) return true;
  return inject(ConfirmService).ask({
    title: 'Leave without saving?',
    message: 'You have changes that are not saved yet. If you leave now, they will be lost.',
    confirmLabel: 'Leave page',
    cancelLabel: 'Keep editing',
    tone: 'danger',
  });
};
