import { Component, input } from '@angular/core';

export type AppIconName =
  | 'alert'
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'bolt'
  | 'camera'
  | 'chart'
  | 'check'
  | 'chevron-right'
  | 'circle'
  | 'circle-check'
  | 'code'
  | 'dashboard'
  | 'edit'
  | 'eye'
  | 'eye-off'
  | 'grid'
  | 'heart'
  | 'image-off'
  | 'info'
  | 'list'
  | 'lock'
  | 'media'
  | 'package'
  | 'package-open'
  | 'plus'
  | 'profile'
  | 'refresh'
  | 'search'
  | 'shield-check'
  | 'shopping-bag'
  | 'sparkles'
  | 'spinner'
  | 'star'
  | 'store'
  | 'trash'
  | 'upload-cloud'
  | 'user-check'
  | 'user-plus'
  | 'x';

@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './icon.component.html',
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
      flex-shrink: 0;
      color: currentColor;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      stroke: currentColor;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    :host(.spin) svg {
      animation: app-icon-spin 1s linear infinite;
    }

    @keyframes app-icon-spin {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class IconComponent {
  readonly name = input.required<AppIconName>();
  readonly size = input(20);
  readonly strokeWidth = input(1.9);
  readonly decorative = input(true);
  readonly ariaLabel = input<string | null>(null);
}
