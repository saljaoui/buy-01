import { Component, computed, input } from '@angular/core';

import { ORDER_STATUS_LABEL, OrderStatus } from '../../../core/models/commerce.models';

export type PillTone = 'neutral' | 'copper' | 'info' | 'success' | 'warning' | 'danger';

/** Order statuses map to a tone; anything else passes its own label + tone. */
const ORDER_TONE: Record<OrderStatus, PillTone> = {
  PENDING: 'copper',
  CONFIRMED: 'info',
  SHIPPED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
};

/** Coloured status pill: <app-status-pill status="SHIPPED" />  or  <app-status-pill label="Needs photos" tone="warning" /> */
@Component({
  selector: 'app-status-pill',
  template: `<span class="pill-dot" aria-hidden="true"></span>{{ text() }}`,
  styleUrl: './status-pill.component.scss',
  host: { '[class]': "'tone-' + resolvedTone()" },
})
export class StatusPillComponent {
  readonly status = input<OrderStatus | null>(null);
  readonly label = input<string | null>(null);
  readonly tone = input<PillTone>('neutral');

  protected readonly text = computed(() => this.label() ?? (this.status() ? ORDER_STATUS_LABEL[this.status()!] : ''));
  protected readonly resolvedTone = computed(() => (this.status() ? ORDER_TONE[this.status()!] : this.tone()));
}
