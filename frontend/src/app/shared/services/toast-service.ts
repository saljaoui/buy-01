import { Injectable, signal } from '@angular/core';


export type ToastType = 'success' | 'error' | 'info' | 'warning';

/** Optional link shown in the toast, e.g. "View cart". */
export interface ToastAction {
  label: string;
  link: string;
}

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private counter = 0;
  toasts = signal<Toast[]>([]);
  show(
    message: string,
    type: ToastType = 'info',
    duration = 3000,
    action?: ToastAction,
  ) {
    // Don't stack the same message twice (e.g. interceptor + page both report one error).
    if (this.toasts().some((t) => t.message === message && t.type === type)) {
      return;
    }

    const toast: Toast = {
      id: ++this.counter,
      message,
      type,
      duration,
      action,
    };
    this.toasts.update(current => [...current, toast]);
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, duration);
    }
  }

  success(message: string, duration?: number, action?: ToastAction) {
    this.show(message, 'success', duration, action);
  }

  error(message: string, duration?: number) {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number) {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number) {
    this.show(message, 'info', duration);
  }

  remove(id: number) {
    this.toasts.update(current =>
      current.filter(t => t.id !== id)
    );
  }
}
