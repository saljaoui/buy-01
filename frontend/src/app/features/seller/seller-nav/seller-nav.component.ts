import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type SellerNavItem = 'dashboard' | 'create-product' | 'media' | 'profile';

@Component({
  selector: 'app-seller-nav',
  imports: [RouterLink],
  templateUrl: './seller-nav.component.html',
})
export class SellerNavComponent {
  @Input() activeItem: SellerNavItem = 'dashboard';
  @Input() productCount = 12;
}
