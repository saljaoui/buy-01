import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { unsavedChangesGuard } from './unsaved-changes.guard';
import { ConfirmService } from '../../shared/ui/confirm/confirm.service';

describe('unsavedChangesGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('lets the user leave when there are no unsaved changes', () => {
    const page = { hasUnsavedChanges: () => false };

    const result = TestBed.runInInjectionContext(() => unsavedChangesGuard(page, route, state, state));

    expect(result).toBe(true);
  });

  it('asks for confirmation when there are unsaved changes', () => {
    const page = { hasUnsavedChanges: () => true };

    TestBed.runInInjectionContext(() => unsavedChangesGuard(page, route, state, state));

    expect(TestBed.inject(ConfirmService).pending()?.title).toBe('Leave without saving?');
  });

  it('keeps the user on the page when they cancel', async () => {
    const page = { hasUnsavedChanges: () => true };
    const result = TestBed.runInInjectionContext(() => unsavedChangesGuard(page, route, state, state));

    TestBed.inject(ConfirmService).answer(false);

    expect(await result).toBe(false);
  });

  it('lets the user leave when they confirm', async () => {
    const page = { hasUnsavedChanges: () => true };
    const result = TestBed.runInInjectionContext(() => unsavedChangesGuard(page, route, state, state));

    TestBed.inject(ConfirmService).answer(true);

    expect(await result).toBe(true);
  });
});
