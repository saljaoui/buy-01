import { TestBed } from '@angular/core/testing';

import { CartService } from './cart.service';

const lamp = { productId: 'p1', name: 'Lamp', price: 10.5, stock: 3, imageUrl: null };

describe('CartService', () => {
  let cart: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    cart = TestBed.inject(CartService);
  });

  it('adds items and computes count and subtotal', () => {
    cart.add(lamp, 2);
    expect(cart.count()).toBe(2);
    expect(cart.subtotal()).toBe(21);
  });

  it('never goes above the stock', () => {
    cart.add(lamp, 2);
    cart.add(lamp, 5);
    expect(cart.quantityOf('p1')).toBe(3);
    cart.update('p1', 99);
    expect(cart.quantityOf('p1')).toBe(3);
  });

  it('ignores sold-out products', () => {
    cart.add({ ...lamp, stock: 0 });
    expect(cart.isEmpty()).toBe(true);
  });

  it('removes when quantity goes to 0, and can undo a removal', () => {
    cart.add(lamp, 1);
    const removed = cart.remove('p1');
    expect(cart.isEmpty()).toBe(true);
    cart.restore(removed!);
    expect(cart.quantityOf('p1')).toBe(1);
    cart.update('p1', 0);
    expect(cart.isEmpty()).toBe(true);
  });

  it('survives a reload (localStorage)', () => {
    cart.add(lamp, 2);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(CartService).quantityOf('p1')).toBe(2);
  });
});
