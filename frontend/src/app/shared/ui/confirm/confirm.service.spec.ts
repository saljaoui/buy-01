import { TestBed } from '@angular/core/testing';

import { ConfirmService } from './confirm.service';

describe('ConfirmService', () => {
  let confirm: ConfirmService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    confirm = TestBed.inject(ConfirmService);
  });

  it('opens a dialog with the question', () => {
    confirm.ask({ title: 'Delete?' });

    expect(confirm.pending()?.title).toBe('Delete?');
  });

  it('answers true when the user confirms', async () => {
    const answer = confirm.ask({ title: 'Delete?' });

    confirm.answer(true);

    expect(await answer).toBe(true);
    expect(confirm.pending()).toBeNull();
  });

  it('answers false when the user cancels', async () => {
    const answer = confirm.ask({ title: 'Delete?' });

    confirm.answer(false);

    expect(await answer).toBe(false);
  });

  it('cancels the previous question when a new one is asked', async () => {
    const first = confirm.ask({ title: 'First?' });

    confirm.ask({ title: 'Second?' });

    expect(await first).toBe(false);
    expect(confirm.pending()?.title).toBe('Second?');
  });
});
