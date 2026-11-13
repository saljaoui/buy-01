import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../icon/icon.component';
import { ProductResponse } from '../../services/product-service';
import { productInitial, stockBadge } from '../stock';

export type ProductCardLayout = 'tile' | 'feature' | 'wide';

/**
 * Catalog card used on the home page and in "You might also like".
 * With no product it renders a skeleton of the same size.
 */
@Component({
  selector: 'app-product-card',
  imports: [RouterLink, CurrencyPipe, NgOptimizedImage, IconComponent],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  host: {
    class: 'product-card',
    '[class.is-skeleton]': '!product()',
    '[class.is-sold-out]': 'badge()?.tone === "out"',
    '[class.layout-feature]': 'layout() === "feature"',
    '[class.layout-wide]': 'layout() === "wide"',
    '[attr.aria-hidden]': 'product() ? null : "true"',
    '[style.--i]': 'index()',
  },
})
export class ProductCardComponent {
  readonly product = input<ProductResponse | null>(null);
  readonly image = input<string | null>(null);
  readonly layout = input<ProductCardLayout>('tile');
  /** Position in the grid, used to stagger the entrance animation. */
  readonly index = input(0);
  /** Responsive `sizes` for the image (vw values only). */
  /** Load the photo first (e.g. when the card is the largest thing on the page). */
  readonly priority = input(false);
  readonly sizes = input('(max-width: 559px) 100vw, (max-width: 899px) 50vw, (max-width: 1199px) 33vw, 25vw');

  /** Only "low" and "out" are worth a badge on a card; "In stock" is the default. */
  protected readonly badge = computed(() => {
    const p = this.product();
    if (!p) return null;
    const b = stockBadge(p.quantity);
    return b.tone === 'in' ? null : b;
  });

  protected readonly initial = computed(() => productInitial(this.product()?.name ?? ''));

  protected isLocal(src: string): boolean {
    return src.startsWith('blob:') || src.startsWith('data:');
  }
}
