import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent, AppIconName } from '../../shared/icon/icon.component';
import { ToastService, ToastType } from '../../shared/services/toast-service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
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
