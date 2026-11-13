import { Injectable, computed, signal } from '@angular/core';

import { CartItem } from '../../core/models/commerce.models';

const CART_KEY = 'buy01.cart';

export interface AddToCartInput {
  productId: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
}

/**
 * Shopping cart.
 *
 * Today the cart lives in the browser (localStorage), so it works without a backend
 * and survives a page reload. Every change updates the signals first, so the UI
 * reacts instantly (optimistic UI). When the backend exists, sync `items` with
 * GET/PUT /api/cart inside this service; pages don't need to change.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly itemsSignal = signal<CartItem[]>(this.read());

  readonly items = this.itemsSignal.asReadonly();
  readonly count = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly subtotal = computed(() =>
    round(this.items().reduce((sum, item) => sum + item.price * item.quantity, 0)),
  );
  readonly isEmpty = computed(() => this.items().length === 0);

  quantityOf(productId: string): number {
    return this.items().find((item) => item.productId === productId)?.quantity ?? 0;
  }

  /** Adds a product, or increases its quantity. Never goes above the stock. */
  add(input: AddToCartInput, quantity = 1): void {
    const max = Math.max(0, input.stock);
    if (max === 0 || quantity <= 0) return;

    const existing = this.items().find((item) => item.productId === input.productId);
    if (existing) {
      this.update(input.productId, existing.quantity + quantity);
      return;
    }

    this.write([
      ...this.items(),
      {
        productId: input.productId,
        name: input.name,
        price: input.price,
        maxQuantity: max,
        imageUrl: input.imageUrl,
        quantity: Math.min(quantity, max),
      },
    ]);
  }

  /** Sets the quantity. 0 removes the item. */
  update(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.remove(productId);
      return;
    }
    this.write(
      this.items().map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(Math.floor(quantity), item.maxQuantity) }
          : item,
      ),
    );
  }

  remove(productId: string): CartItem | undefined {
    const removed = this.items().find((item) => item.productId === productId);
    this.write(this.items().filter((item) => item.productId !== productId));
    return removed;
  }

  /** Puts a removed item back (used by the "Undo" action). */
  restore(item: CartItem): void {
    if (this.items().some((i) => i.productId === item.productId)) return;
    this.write([...this.items(), item]);
  }

  clear(): void {
    this.write([]);
  }

  private write(items: CartItem[]): void {
    this.itemsSignal.set(items);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* storage full or disabled: the in-memory cart still works */
    }
  }

  private read(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
      return Array.isArray(parsed) ? parsed.filter((i) => i && i.productId && i.quantity > 0) : [];
    } catch {
      return [];
    }
  }
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}
