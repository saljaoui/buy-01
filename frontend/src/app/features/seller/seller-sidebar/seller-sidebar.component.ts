import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../../shared/icon/icon.component';
import { SellerNavComponent, SellerNavItem } from '../seller-nav/seller-nav.component';

@Component({
  selector: 'app-seller-sidebar',
  imports: [RouterLink, SellerNavComponent, IconComponent],
  templateUrl: './seller-sidebar.component.html',
})
export class SellerSidebarComponent {
  @Input({ required: true }) activeItem!: SellerNavItem;
  @Input() initials = 'U';
  @Input() name = 'Seller';
  @Input() subtitle = 'Seller account';
  @Input() productCount: number | null = null;
}
