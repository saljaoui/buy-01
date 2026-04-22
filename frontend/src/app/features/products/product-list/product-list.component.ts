import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FooterComponent } from '../../../shared/footer/footer.component';

import { AuthUser } from '../../auth/auth.models';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, FooterComponent],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductListComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected currentUser = this.authService.getStoredUser();

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

  protected scrollCatalog(): void {
    const element = document.getElementById('catalog');
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
