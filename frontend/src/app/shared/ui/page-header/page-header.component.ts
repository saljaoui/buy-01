import { Component, input } from '@angular/core';

/**
 * Page title block: eyebrow, serif title, subtitle, and the page's main action(s).
 *   <app-page-header title="Orders" subtitle="…">
 *     <a actions class="primary-btn">New product</a>
 *   </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  template: `
    <div class="ph-copy">
      @if (eyebrow()) {
        <p class="ph-eyebrow">{{ eyebrow() }}</p>
      }
      <h1 class="ph-title">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="ph-subtitle">{{ subtitle() }}</p>
      }
      <ng-content select="[meta]" />
    </div>
    <div class="ph-actions"><ng-content select="[actions]" /></div>
  `,
  styleUrl: './page-header.component.scss',
  host: { class: 'page-header-block' },
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly eyebrow = input<string | null>(null);
}
