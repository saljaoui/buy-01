import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, AppIconName } from '../../shared/icon/icon.component';
import { ToastService, ToastType } from '../../shared/services/toast-service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './toast.html',
  styleUrls: ['./toast.scss']
})
export class ToastComponent {

  toastService = inject(ToastService);

  protected iconFor(type: ToastType): AppIconName {
    if (type === 'success') {
      return 'circle-check';
    }

    if (type === 'info') {
      return 'info';
    }

    return 'alert';
  }
}
