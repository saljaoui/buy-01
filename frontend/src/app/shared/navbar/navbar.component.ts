import { Component, inject } from '@angular/core';
import { AuthService } from '../../features/auth/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthUser } from '../../features/auth/auth.models';
import { IconComponent } from '../icon/icon.component';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, IconComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly cart = inject(CartService);

  protected currentUser = this.authService.getStoredUser();

  /** Current search text, so the box shows what the catalog is filtered by. */
  protected searchText = this.route.snapshot.queryParamMap.get('q') ?? '';

  /** Sellers can't buy, so they get no cart. */
  protected get canShop(): boolean {
    return this.currentUser?.role !== 'SELLER';
  }

  protected get isClient(): boolean {
    return this.currentUser?.role === 'CLIENT';
  }

  protected search(event: Event, value: string): void {
    event.preventDefault();
    const q = value.trim();
    void this.router.navigate(['/products'], { queryParams: q ? { q } : {} });
  }

  protected get sellerDashboardLink(): string | null {
    return this.currentUser?.role === 'SELLER' ? '/seller' : null;
  }

  protected get profileLabel(): string {
    if (!this.currentUser) {
      return '';
    }

    return this.currentUser.role === 'SELLER' ? 'Seller profile' : 'Client account';
  }

  protected get userInitials(): string {
    return this.getUserInitials(this.currentUser);
  }

  protected logout(): void {
    this.authService.clearSession();
    this.currentUser = null;
    void this.router.navigate(['/login']);
  }

  private getUserInitials(user: AuthUser | null): string {
    if (!user?.name) {
      return 'U';
    }

    const initials = user.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    return initials || 'U';
  }
}
