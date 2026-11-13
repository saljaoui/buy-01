/**
 * Cart, order and analytics models.
 *
 * These are the shapes the frontend expects from the future backend
 * (order-service). Keep the backend DTOs identical and the pages will not change.
 */

// ---------- Cart ----------

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  /** Stock when the item was added. Used to cap the quantity in the UI. */
  maxQuantity: number;
  imageUrl: string | null;
}

// ---------- Orders ----------

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type PaymentMethod = 'PAY_ON_DELIVERY';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  notes?: string;
}

export interface OrderStatusChange {
  status: OrderStatus;
  at: string; // ISO date
}

export interface Order {
  id: string;
  /** Short, human-friendly number shown to users, e.g. "B01-7F3K2". */
  reference: string;
  buyerId: string;
  buyerName: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  address: ShippingAddress;
  createdAt: string;
  updatedAt: string;
  history: OrderStatusChange[];
}

/** Body of POST /api/orders */
export interface PlaceOrderRequest {
  items: { productId: string; quantity: number }[];
  address: ShippingAddress;
  paymentMethod: PaymentMethod;
}

/** Query of GET /api/orders and GET /api/seller/orders */
export interface OrderQuery {
  q?: string;
  status?: OrderStatus | 'ALL';
}

// ---------- Analytics ----------

export interface ProductStat {
  productId: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  amount: number;
}

/** GET /api/users/me/stats */
export interface BuyerStats {
  totalSpent: number;
  orderCount: number;
  itemsBought: number;
  topProducts: ProductStat[];
}

/** GET /api/seller/stats */
export interface SellerStats {
  revenue: number;
  unitsSold: number;
  orderCount: number;
  bestSellers: ProductStat[];
}

// ---------- Search ----------

export type ProductSort = 'newest' | 'price-asc' | 'price-desc' | 'name';

/** Query of GET /api/products (public, read-only) */
export interface ProductSearchQuery {
  q?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean;
  sort?: ProductSort;
  page: number;
  size: number;
}

// ---------- Shared helpers ----------

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Placed',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

/** The order of statuses for a normal order. CANCELLED is a side exit. */
export const ORDER_FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

/** A buyer may cancel only before the parcel leaves. */
export function canCancel(status: OrderStatus): boolean {
  return status === 'PENDING' || status === 'CONFIRMED';
}

/** The next status a seller can move an order to, if any. */
export function nextSellerStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case 'PENDING':
      return 'CONFIRMED';
    case 'CONFIRMED':
      return 'SHIPPED';
    case 'SHIPPED':
      return 'DELIVERED';
    default:
      return null;
  }
}

export const SHIPPING_FEE = 0;
