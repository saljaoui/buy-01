import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ToastComponent } from './toast';
import { ToastService } from '../../shared/services/toast-service';

describe('ToastComponent', () => {
  let toasts: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToastComponent], providers: [provideRouter([])] });
    toasts = TestBed.inject(ToastService);
  });

  it('shows the toast message', () => {
    toasts.success('Product saved', 0);

    const fixture = TestBed.createComponent(ToastComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.toast').textContent).toContain('Product saved');
  });

  it('removes the toast when the close button is clicked', () => {
    toasts.success('Product saved', 0);
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[aria-label="Dismiss notification"]').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.toast')).toBeNull();
  });
});
