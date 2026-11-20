import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { SellerShellService } from './seller-shell.service';
import { AuthService } from '../../auth/auth.service';
import { MediaService } from '../../../shared/services/media-service';
import { OrderService } from '../../../shared/services/order.service';
import { ProductService } from '../../../shared/services/product-service';

describe('SellerShellService', () => {
  const bowl = { id: '1', name: 'Walnut bowl', description: 'A bowl', price: 30, quantity: 4, owner: true };
  const pendingOrder = { order: { id: 'o1', status: 'PENDING' }, items: [], sellerTotal: 10 };
  const deliveredOrder = { order: { id: 'o2', status: 'DELIVERED' }, items: [], sellerTotal: 10 };
  const productService = { getProductsOwnedBy: vi.fn() };
  let shell: SellerShellService;

  beforeEach(() => {
    vi.clearAllMocks();
    productService.getProductsOwnedBy.mockReturnValue(of([bowl]));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: ProductService, useValue: productService },
        { provide: MediaService, useValue: { getMediaByProduct: () => of([{ id: 'm1' }, { id: 'm2' }]) } },
        { provide: OrderService, useValue: { sellerOrders: () => of([pendingOrder, deliveredOrder]) } },
      ],
    });
    vi.spyOn(TestBed.inject(AuthService), 'getStoredUser').mockReturnValue({ id: 's1', name: 'Ada', email: 'a@x.com', role: 'SELLER' });
    shell = TestBed.inject(SellerShellService);
  });

  it('loads the product and photo counts of the seller', () => {
    shell.ensureLoaded();

    expect(productService.getProductsOwnedBy).toHaveBeenCalledWith('s1');
    expect(shell.productCount()).toBe(1);
    expect(shell.mediaCount()).toBe(2);
  });

  it('counts only the orders that need action', () => {
    shell.ensureLoaded();

    expect(shell.ordersNeedingAction()).toBe(1);
  });

  it('does not load twice', () => {
    shell.ensureLoaded();
    shell.ensureLoaded();

    expect(productService.getProductsOwnedBy).toHaveBeenCalledTimes(1);
  });

  it('reset clears all counts', () => {
    shell.ensureLoaded();

    shell.reset();

    expect(shell.productCount()).toBe(0);
    expect(shell.mediaCount()).toBe(0);
  });
});
