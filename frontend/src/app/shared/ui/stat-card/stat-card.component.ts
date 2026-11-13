import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';

import { AppIconName, IconComponent } from '../../icon/icon.component';
import { PillTone } from '../status-pill/status-pill.component';

const COUNT_UP_MS = 900;

/**
 * Metric card: icon, label, big number (counts up on load), a sparkline or a progress
 * meter, and a badge that says what the number means ("Last 14 days", "2 out of stock").
 */
@Component({
  selector: 'app-stat-card',
  imports: [IconComponent],
  providers: [CurrencyPipe, DecimalPipe],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
  host: { '[class]': "'stat-card tone-' + tone()" },
})
export class StatCardComponent {
  private readonly currency = inject(CurrencyPipe);
  private readonly decimal = inject(DecimalPipe);

  readonly label = input.required<string>();
  readonly value = input(0);
  readonly format = input<'number' | 'currency'>('number');
  readonly icon = input<AppIconName>('chart');
  readonly tone = input<'copper' | 'green' | 'blue' | 'red'>('copper');
  /** Short line explaining the number. */
  readonly hint = input<string | null>(null);
  /** Badge text + tone, e.g. "Last 14 days". */
  readonly badge = input<string | null>(null);
  readonly badgeTone = input<PillTone>('neutral');
  /** Change vs the previous period, in % (null = unknown). */
  readonly trend = input<number | null>(null);
  /** Values for the sparkline (oldest → newest). */
  readonly series = input<number[] | null>(null);
  /** 0..1 progress meter, used instead of a sparkline. */
  readonly progress = input<number | null>(null);

  /** The number currently shown (animates towards `value`). */
  protected readonly shown = signal(0);
  protected readonly display = computed(() => this.formatValue(this.shown()));
  protected readonly finalDisplay = computed(() => this.formatValue(this.value()));
  protected readonly trendLabel = computed(() => {
    const t = this.trend();
    if (t === null || !Number.isFinite(t)) return null;
    return `${t > 0 ? '+' : ''}${Math.round(t)}%`;
  });

  /** SVG paths for the sparkline in a 120×36 box. */
  protected readonly spark = computed(() => {
    const values = this.series();
    if (!values || values.length < 2) return null;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const step = 120 / (values.length - 1);
    const points = values.map((v, i) => [i * step, 32 - ((v - min) / range) * 28] as const);
    const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    return { line, area: `${line} L120 36 L0 36 Z` };
  });

  private frame: number | null = null;

  constructor() {
    effect(() => {
      const target = this.value();
      untracked(() => this.animateTo(target));
    });
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  private animateTo(target: number): void {
    this.stop();
    const from = this.shown();
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof requestAnimationFrame !== 'function' || from === target) {
      this.shown.set(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      this.shown.set(from + (target - from) * eased);
      this.frame = t < 1 ? requestAnimationFrame(tick) : null;
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stop(): void {
    if (this.frame !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  private formatValue(v: number): string {
    if (this.format() === 'currency') return this.currency.transform(v, 'USD', 'symbol', '1.0-0') ?? '';
    return this.decimal.transform(Math.round(v), '1.0-0') ?? '';
  }
}
