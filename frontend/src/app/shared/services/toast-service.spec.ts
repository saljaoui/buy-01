
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastService } from './toast-service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add a toast', () => {
    service.show('Hello world');

    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Hello world');
  });

  it('should use info as the default toast type', () => {
    service.show('Information');

    expect(service.toasts()[0].type).toBe('info');
  });

  it('should add a success toast', () => {
    service.success('Saved successfully');

    expect(service.toasts()[0].type).toBe('success');
    expect(service.toasts()[0].message).toBe('Saved successfully');
  });

  it('should add an error toast', () => {
    service.error('Something went wrong');

    expect(service.toasts()[0].type).toBe('error');
  });

  it('should add a warning toast', () => {
    service.warning('Be careful');

    expect(service.toasts()[0].type).toBe('warning');
  });

  it('should add an info toast', () => {
    service.info('Here is some information');

    expect(service.toasts()[0].type).toBe('info');
  });

  it('should automatically remove a toast after its duration', () => {
    service.show('Temporary message', 'success', 3000);

    expect(service.toasts().length).toBe(1);

    vi.advanceTimersByTime(2999);
    expect(service.toasts().length).toBe(1);

    vi.advanceTimersByTime(1);
    expect(service.toasts().length).toBe(0);
  });

  it('should not automatically remove a toast when duration is 0', () => {
    service.show('Permanent message', 'info', 0);

    vi.advanceTimersByTime(5000);

    expect(service.toasts().length).toBe(1);
  });

  it('should remove a toast by its ID', () => {
    service.show('First toast');
    service.show('Second toast');

    const firstToastId = service.toasts()[0].id;

    service.remove(firstToastId);

    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Second toast');
  });

  it('should assign a unique ID to each toast', () => {
    service.show('First');
    service.show('Second');

    const toasts = service.toasts();

    expect(toasts[0].id).not.toBe(toasts[1].id);
  });

  it('should keep multiple toasts', () => {
    service.show('First');
    service.show('Second');
    service.show('Third');

    expect(service.toasts().length).toBe(3);
  });
});
