import { Component, Input, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { ProductService } from '../../../shared/services/product-service';
import { IconComponent } from '../../../shared/icon/icon.component';

export type SellerNavItem = 'dashboard' | 'create-product' | 'media' | 'profile';

@Component({
  selector: 'app-seller-nav',
  imports: [RouterLink, IconComponent],
  templateUrl: './seller-nav.component.html',
})
export class SellerNavComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly productService = inject(ProductService);

  @Input() activeItem: SellerNavItem = 'dashboard';
  @Input() productCount: number | null = null;
  protected loadedProductCount = 0;

  protected get visibleProductCount(): number {
    return this.productCount ?? this.loadedProductCount;
  }

  ngOnInit(): void {
    if (this.productCount !== null) {
      return;
    }

    const user = this.authService.getStoredUser();
    if (!user) {
      return;
    }

    this.productService.getProductsOwnedBy(user.id).subscribe({
      next: (products) => {
        this.loadedProductCount = products.length;
      },
      error: () => {
        this.loadedProductCount = 0;
      },
    });
  }
}
