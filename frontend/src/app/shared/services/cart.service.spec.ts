import { TestBed } from '@angular/core/testing';

import { CartService } from './cart.service';

describe('CartService', () => {
  const lamp = { productId: 'p1', name: 'Lamp', price: 10.5, stock: 3, imageUrl: null };
  let cart: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    cart = TestBed.inject(CartService);
  });

  it('adds items and computes the count and the subtotal', () => {
    cart.add(lamp, 2);

    expect(cart.count()).toBe(2);
    expect(cart.subtotal()).toBe(21);
  });

  it('never goes above the stock', () => {
    cart.add(lamp, 2);

    cart.add(lamp, 5);

    expect(cart.quantityOf('p1')).toBe(3);
  });

  it('ignores a sold-out product', () => {
    cart.add({ ...lamp, stock: 0 });

    expect(cart.isEmpty()).toBe(true);
  });

  it('removes the item when the quantity is set to 0', () => {
    cart.add(lamp, 1);

    cart.update('p1', 0);

    expect(cart.isEmpty()).toBe(true);
  });

  it('restores a removed item (undo)', () => {
    cart.add(lamp, 1);
    const removed = cart.remove('p1');

    cart.restore(removed!);

    expect(cart.quantityOf('p1')).toBe(1);
  });

  it('clear empties the cart', () => {
    cart.add(lamp, 2);

    cart.clear();

    expect(cart.count()).toBe(0);
  });

  it('keeps the cart after a page reload (localStorage)', () => {
    cart.add(lamp, 2);

    TestBed.resetTestingModule();
    const cartAfterReload = TestBed.inject(CartService);

    expect(cartAfterReload.quantityOf('p1')).toBe(2);
  });
});
