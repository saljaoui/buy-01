import { TestBed } from '@angular/core/testing';

import { ToastService } from './toast-service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  it('show adds a toast with the message', () => {
    service.show('Hello world');

    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Hello world');
  });

  it('success creates a success toast', () => {
    service.success('Saved');

    expect(service.toasts()[0].type).toBe('success');
  });

  it('error creates an error toast', () => {
    service.error('Something went wrong');

    expect(service.toasts()[0].type).toBe('error');
  });

  it('removes a toast automatically after its duration', () => {
    service.show('Temporary', 'info', 3000);

    vi.advanceTimersByTime(3000);

    expect(service.toasts().length).toBe(0);
  });

  it('keeps a toast with duration 0', () => {
    service.show('Permanent', 'info', 0);

    vi.advanceTimersByTime(10000);

    expect(service.toasts().length).toBe(1);
  });

  it('remove deletes only the chosen toast', () => {
    service.show('First');
    service.show('Second');

    service.remove(service.toasts()[0].id);

    expect(service.toasts().map((t) => t.message)).toEqual(['Second']);
  });
});
