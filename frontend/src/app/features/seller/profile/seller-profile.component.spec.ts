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
  const userService = { getCurrentUser: vi.fn(), updateCurrentUser: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    userService.getCurrentUser.mockReturnValue(of(user));
    userService.updateCurrentUser.mockReturnValue(of({ ...user, name: 'Ada L.' }));
    TestBed.configureTestingModule({
      imports: [SellerProfileComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: UserService, useValue: userService },
        { provide: ProductService, useValue: { getProductsOwnedBy: () => of([]) } },
        { provide: OrderService, useValue: { sellerStats: () => of({ revenue: 0, unitsSold: 0, orderCount: 0, bestSellers: [] }) } },
      ],
    });
    vi.spyOn(TestBed.inject(AuthService), 'getStoredUser').mockReturnValue(user);
  });

  it('shows the seller name and email', () => {
    const fixture = TestBed.createComponent(SellerProfileComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#pr-name').textContent).toContain('Ada Lovelace');
    expect(fixture.nativeElement.querySelector('.pr-readonly').textContent).toContain('ada@x.com');
  });

  it('has only one editable text field: the name', () => {
    const fixture = TestBed.createComponent(SellerProfileComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('input:not([type=file])').length).toBe(1);
  });

  it('disables Save when the name did not change', () => {
    const fixture = TestBed.createComponent(SellerProfileComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid=save-profile]').disabled).toBe(true);
  });

  it('saves the new name', () => {
    const fixture = TestBed.createComponent(SellerProfileComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#pr-name-input');
    input.value = 'Ada L.';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid=save-profile]').click();

    expect(userService.updateCurrentUser).toHaveBeenCalledWith({ name: 'Ada L.', avatar: null });
  });

  it('shows "No best sellers yet" when nothing was sold', () => {
    const fixture = TestBed.createComponent(SellerProfileComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No best sellers yet');
  });
});
