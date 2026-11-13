import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { SellerProfileComponent } from './seller-profile.component';
import { AuthService } from '../../auth/auth.service';
import { UserService } from '../../../core/services/user.service';
import { OrderService } from '../../../shared/services/order.service';
import { ProductService } from '../../../shared/services/product-service';

describe('SellerProfileComponent', () => {
  const user = { id: 's', name: 'Ada Lovelace', email: 'ada@x.com', role: 'SELLER' as const, avatar: null };

  const setup = () => {
    const update = vi.fn((body) => of({ ...user, ...body }));
    TestBed.configureTestingModule({
      imports: [SellerProfileComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: UserService, useValue: { getCurrentUser: () => of(user), updateCurrentUser: update } },
        { provide: ProductService, useValue: { getProductsOwnedBy: () => of([]) } },
        { provide: OrderService, useValue: { sellerStats: () => of({ revenue: 0, unitsSold: 0, orderCount: 0, bestSellers: [] }) } },
      ],
    });
    vi.spyOn(TestBed.inject(AuthService), 'getStoredUser').mockReturnValue(user);
    const fixture = TestBed.createComponent(SellerProfileComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, update };
  };

  it('one hero with avatar, name and Seller badge; email is read-only text, no role input', () => {
    const { el } = setup();
    expect(el.querySelector('#pr-name')!.textContent).toContain('Ada Lovelace');
    expect(el.querySelector('.pr-role')!.textContent).toContain('Seller');
    expect(el.querySelector('[data-testid=avatar-btn]')!.getAttribute('aria-label')).toBe('Add a profile photo');
    expect(el.querySelector('.pr-readonly')!.textContent).toContain('ada@x.com');
    expect(el.querySelectorAll('input:not([type=file])').length).toBe(1); // only the name
  });

  it('Save is only enabled when the name changed', () => {
    const { fixture, el, update } = setup();
    const save = () => el.querySelector<HTMLButtonElement>('[data-testid=save-profile]')!;
    expect(save().disabled).toBe(true);

    const input = el.querySelector<HTMLInputElement>('#pr-name-input')!;
    input.value = 'Ada L.';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(save().disabled).toBe(false);

    save().click();
    fixture.detectChanges();
    expect(update).toHaveBeenCalledWith({ name: 'Ada L.', avatar: null });
    expect(save().disabled).toBe(true);
  });

  it('sales use the stat cards; best sellers has an empty state', () => {
    const { el } = setup();
    expect(el.querySelectorAll('app-seller-sales app-stat-card').length).toBe(3);
    expect(el.textContent).toContain('No best sellers yet');
  });
});
