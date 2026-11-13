import { CurrencyPipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { ORDER_STATUS_LABEL } from '../../../core/models/commerce.models';
import { IconComponent } from '../../../shared/icon/icon.component';
import { SellerShellService } from '../seller-layout/seller-shell.service';

interface SearchResult {
  id: string;
  kind: 'product' | 'order' | 'store';
  title: string;
  meta: string;
  url: string;
  queryParams?: Record<string, string>;
}

const PER_GROUP = 5;

/**
 * Topbar search over the seller's own products and orders (already loaded by the shell),
 * plus a jump to the public store search. ⌘K / Ctrl+K focuses it.
 */
@Component({
  selector: 'app-seller-search',
  imports: [IconComponent],
  providers: [CurrencyPipe],
  templateUrl: './seller-search.component.html',
  host: {
    '(document:keydown)': 'onGlobalKey($event)',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class SellerSearchComponent {
  private readonly shell = inject(SellerShellService);
  private readonly router = inject(Router);
  private readonly currency = inject(CurrencyPipe);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');

  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly activeIndex = signal(0);
  protected readonly isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  protected readonly results = computed<SearchResult[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    const products = (this.shell.products() ?? [])
      .filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      .slice(0, PER_GROUP)
      .map<SearchResult>((p) => ({
        id: 'p-' + p.id,
        kind: 'product',
        title: p.name,
        meta: `${this.currency.transform(p.price, 'USD')} · ${p.quantity} in stock`,
        url: `/seller/products/${p.id}/edit`,
      }));
    const orders = this.shell
      .orders()
      .filter(
        (v) =>
          v.order.reference.toLowerCase().includes(q) ||
          v.order.buyerName.toLowerCase().includes(q) ||
          v.items.some((i) => i.name.toLowerCase().includes(q)),
      )
      .slice(0, PER_GROUP)
      .map<SearchResult>((v) => ({
        id: 'o-' + v.order.id,
        kind: 'order',
        title: v.order.reference,
        meta: `${v.order.buyerName} · ${ORDER_STATUS_LABEL[v.order.status]}`,
        url: '/seller/orders',
        queryParams: { q: v.order.reference },
      }));
    return [
      ...products,
      ...orders,
      { id: 'store', kind: 'store', title: `Search the store for “${this.query().trim()}”`, meta: 'Public catalog', url: '/products', queryParams: { q: this.query().trim() } },
    ];
  });

  protected readonly productResults = computed(() => this.results().filter((r) => r.kind === 'product'));
  protected readonly orderResults = computed(() => this.results().filter((r) => r.kind === 'order'));
  protected readonly storeResult = computed(() => this.results().find((r) => r.kind === 'store') ?? null);

  protected onInput(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
    this.open.set(value.trim().length > 0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const total = this.results().length;
    if (event.key === 'ArrowDown' && total) {
      event.preventDefault();
      this.open.set(true);
      this.activeIndex.set((this.activeIndex() + 1) % total);
    } else if (event.key === 'ArrowUp' && total) {
      event.preventDefault();
      this.activeIndex.set((this.activeIndex() - 1 + total) % total);
    } else if (event.key === 'Enter' && this.open() && total) {
      event.preventDefault();
      this.go(this.results()[this.activeIndex()]);
    } else if (event.key === 'Escape') {
      this.close();
      (event.target as HTMLInputElement).blur();
    }
  }

  protected indexOf(result: SearchResult): number {
    return this.results().indexOf(result);
  }

  protected go(result: SearchResult): void {
    void this.router.navigate([result.url], { queryParams: result.queryParams });
    this.close();
    this.query.set('');
    const el = this.input()?.nativeElement;
    if (el) el.value = '';
  }

  protected onGlobalKey(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.input()?.nativeElement.focus();
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  private close(): void {
    this.open.set(false);
  }
}
