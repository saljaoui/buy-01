import { Component, input } from '@angular/core';

import { AppIconName, IconComponent } from '../../icon/icon.component';

/**
 * Friendly empty / error state: a small icon medallion, a serif title, a line of help,
 * and projected actions.  <app-empty-state icon="package" title="…" message="…"><a actions …/></app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  template: `
    <span class="es-icon" [class.is-error]="tone() === 'error'" aria-hidden="true">
      <app-icon [name]="icon()" [size]="size() === 'sm' ? 20 : 24"></app-icon>
    </span>
    <strong class="es-title">{{ title() }}</strong>
    @if (message()) {
      <p class="es-message">{{ message() }}</p>
    }
    <div class="es-actions"><ng-content select="[actions]" /></div>
    <ng-content />
  `,
  styleUrl: './empty-state.component.scss',
  host: { '[class.is-sm]': "size() === 'sm'", '[attr.role]': "tone() === 'error' ? 'alert' : null" },
})
export class EmptyStateComponent {
  readonly icon = input<AppIconName>('package-open');
  readonly title = input.required<string>();
  readonly message = input<string | null>(null);
  readonly size = input<'sm' | 'md'>('md');
  readonly tone = input<'neutral' | 'error'>('neutral');
}
