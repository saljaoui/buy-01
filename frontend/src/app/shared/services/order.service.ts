import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, delay, of, throwError } from 'rxjs';

import {
  BuyerStats,
  Order,
  OrderItem,
  OrderQuery,
  OrderStatus,
  PlaceOrderRequest,
  ProductStat,
  SHIPPING_FEE,
  SellerStats,
  canCancel,
  nextSellerStatus,
} from '../../core/models/commerce.models';
import { AuthService } from '../../features/auth/auth.service';
import { round } from './cart.service';

const ORDERS_KEY = 'buy01.orders';
const LATENCY_MS = 250;

/** What a seller sees: the order, but only the lines that are theirs. */
export interface SellerOrderView {
  order: Order;
  items: OrderItem[];
  sellerTotal: number;
}

/** Item details the checkout knows (name, price, image) for each cart line. */
export type CheckoutLine = OrderItem;

/**
 * Orders, checkout and analytics.
 *
 * ── Temporary local implementation ──────────────────────────────────────────
 * Until order-service exists, orders are kept in this browser (localStorage).
 * The public methods match the planned REST API, and errors are real
 * HttpErrorResponse objects (403 / 404 / 409), so pages behave the same when
 * this is swapped for HTTP calls:
 *
 *   placeOrder      POST   /api/orders
 *   myOrders        GET    /api/orders?q=&status=
 *   getOrder        GET    /api/orders/{id}
 *   cancelOrder     POST   /api/orders/{id}/cancel
 *   sellerOrders    GET    /api/seller/orders?q=&status=
 *   advanceStatus   PATCH  /api/seller/orders/{id}/status
 *   buyerStats      GET    /api/users/me/stats
 *   sellerStats     GET    /api/seller/stats
 *
 * The server must repeat every rule enforced here (ownership, allowed status
 * changes, stock); the browser copy is only for the UI.
 * ────────────────────────────────────────────────────────────────────────────
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly auth = inject(AuthService);

  // ---------- Buyer ----------

  placeOrder(request: PlaceOrderRequest, lines: CheckoutLine[]): Observable<Order> {
    return this.run(() => {
      const user = this.requireUser('CLIENT');
      if (request.items.length === 0) {
        throw httpError(400, 'Your cart is empty.');
      }
      if (request.paymentMethod !== 'PAY_ON_DELIVERY') {
        throw httpError(400, 'This payment method is not available.');
      }

      const items: OrderItem[] = request.items.map((requested) => {
        const line = lines.find((l) => l.productId === requested.productId);
        if (!line || requested.quantity <= 0) {
          throw httpError(400, 'One of the items in your cart is not valid.');
        }
        return { ...line, quantity: requested.quantity };
      });

      const subtotal = round(items.reduce((sum, i) => sum + i.price * i.quantity, 0));
      const now = new Date().toISOString();
      const order: Order = {
        id: cryptoId(),
        reference: makeReference(),
        buyerId: user.id,
        buyerName: user.name,
        items,
        subtotal,
        shippingFee: SHIPPING_FEE,
        total: round(subtotal + SHIPPING_FEE),
        status: 'PENDING',
        paymentMethod: 'PAY_ON_DELIVERY',
        address: request.address,
        createdAt: now,
        updatedAt: now,
        history: [{ status: 'PENDING', at: now }],
      };

      this.save([order, ...this.all()]);
      return order;
    });
  }

  myOrders(query: OrderQuery = {}): Observable<Order[]> {
    return this.run(() => {
      const user = this.requireUser();
      return this.filter(
        this.all().filter((o) => o.buyerId === user.id),
        query,
      );
    });
  }

  getOrder(id: string): Observable<Order> {
    return this.run(() => {
      const user = this.requireUser();
      const order = this.all().find((o) => o.id === id);
      if (!order) throw httpError(404, 'We could not find this order.');
      if (order.buyerId !== user.id) throw httpError(403, 'This order belongs to another account.');
      return order;
    });
  }

  cancelOrder(id: string): Observable<Order> {
    return this.run(() => {
      const user = this.requireUser();
      const order = this.all().find((o) => o.id === id);
      if (!order) throw httpError(404, 'We could not find this order.');
      if (order.buyerId !== user.id) throw httpError(403, 'This order belongs to another account.');
      if (!canCancel(order.status)) {
        throw httpError(409, 'This order has already shipped and can no longer be cancelled.');
      }
      return this.setStatus(order, 'CANCELLED');
    });
  }

  buyerStats(): Observable<BuyerStats> {
    return this.run(() => {
      const user = this.requireUser();
      const orders = this.all().filter((o) => o.buyerId === user.id && o.status !== 'CANCELLED');
      const lines = orders.flatMap((o) => o.items);
      return {
        totalSpent: round(orders.reduce((sum, o) => sum + o.total, 0)),
        orderCount: orders.length,
        itemsBought: lines.reduce((sum, i) => sum + i.quantity, 0),
        topProducts: rankProducts(lines).slice(0, 5),
      };
    });
  }

  // ---------- Seller ----------

  /**
   * Orders that contain at least one of the seller's products.
   * `sellerProductIds` stands in for the seller id the backend will read from the JWT.
   */
  sellerOrders(sellerProductIds: string[], query: OrderQuery = {}): Observable<SellerOrderView[]> {
    return this.run(() => {
      this.requireUser('SELLER');
      const owned = new Set(sellerProductIds);
      const views = this.all()
        .map((order) => {
          const items = order.items.filter((i) => owned.has(i.productId));
          return { order, items, sellerTotal: round(items.reduce((s, i) => s + i.price * i.quantity, 0)) };
        })
        .filter((view) => view.items.length > 0);

      const matched = new Set(this.filter(views.map((v) => v.order), query).map((o) => o.id));
      return views.filter((v) => matched.has(v.order.id));
    });
  }

  /** Moves an order one step forward (Placed → Confirmed → On the way → Delivered). */
  advanceStatus(orderId: string, sellerProductIds: string[]): Observable<Order> {
    return this.run(() => {
      this.requireUser('SELLER');
      const order = this.all().find((o) => o.id === orderId);
      if (!order) throw httpError(404, 'We could not find this order.');
      if (!order.items.some((i) => sellerProductIds.includes(i.productId))) {
        throw httpError(403, 'This order does not contain any of your products.');
      }
      const next = nextSellerStatus(order.status);
      if (!next) throw httpError(409, 'This order cannot be updated any more.');
      return this.setStatus(order, next);
    });
  }

  sellerStats(sellerProductIds: string[]): Observable<SellerStats> {
    return this.run(() => {
      this.requireUser('SELLER');
      const owned = new Set(sellerProductIds);
      const orders = this.all().filter((o) => o.status !== 'CANCELLED');
      const lines = orders.flatMap((o) => o.items.filter((i) => owned.has(i.productId)));
      return {
        revenue: round(lines.reduce((sum, i) => sum + i.price * i.quantity, 0)),
        unitsSold: lines.reduce((sum, i) => sum + i.quantity, 0),
        orderCount: orders.filter((o) => o.items.some((i) => owned.has(i.productId))).length,
        bestSellers: rankProducts(lines).slice(0, 5),
      };
    });
  }

  // ---------- Internals ----------

  private filter(orders: Order[], query: OrderQuery): Order[] {
    const q = query.q?.trim().toLowerCase() ?? '';
    return orders
      .filter((o) => !query.status || query.status === 'ALL' || o.status === query.status)
      .filter(
        (o) =>
          !q ||
          o.reference.toLowerCase().includes(q) ||
          o.buyerName.toLowerCase().includes(q) ||
          o.items.some((i) => i.name.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private setStatus(order: Order, status: OrderStatus): Order {
    const now = new Date().toISOString();
    const updated: Order = { ...order, status, updatedAt: now, history: [...order.history, { status, at: now }] };
    this.save(this.all().map((o) => (o.id === order.id ? updated : o)));
    return updated;
  }

  private requireUser(role?: 'CLIENT' | 'SELLER') {
    const user = this.auth.getAuthenticatedUser();
    if (!user) throw httpError(401, 'Please sign in to continue.');
    if (role && user.role !== role) {
      throw httpError(403, role === 'CLIENT' ? 'Seller accounts cannot place orders.' : 'Only sellers can do this.');
    }
    return user;
  }

  private all(): Order[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? '[]');
      return Array.isArray(parsed) ? (parsed as Order[]) : [];
    } catch {
      return [];
    }
  }

  private save(orders: Order[]): void {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  /** Runs the work asynchronously, like a network call, and turns thrown errors into Observable errors. */
  private run<T>(work: () => T): Observable<T> {
    return defer(() => {
      try {
        return of(work());
      } catch (error) {
        return throwError(() => error);
      }
    }).pipe(delay(LATENCY_MS));
  }
}

function rankProducts(lines: OrderItem[]): ProductStat[] {
  const byProduct = new Map<string, ProductStat>();
  for (const line of lines) {
    const stat = byProduct.get(line.productId) ?? {
      productId: line.productId,
      name: line.name,
      imageUrl: line.imageUrl,
      quantity: 0,
      amount: 0,
    };
    stat.quantity += line.quantity;
    stat.amount = round(stat.amount + line.price * line.quantity);
    byProduct.set(line.productId, stat);
  }
  return [...byProduct.values()].sort((a, b) => b.quantity - a.quantity || b.amount - a.amount);
}

function httpError(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { status, message }, url: '/api/orders' });
}

function cryptoId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `B01-${code}`;
}
