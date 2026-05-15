import { Injectable, signal } from '@angular/core';


export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
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
    duration = 3000
  ) {
    const toast: Toast = {
      id: ++this.counter,
      message,
      type,
      duration
    };
    this.toasts.update(current => [...current, toast]);
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, duration);
    }
  }

  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
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
