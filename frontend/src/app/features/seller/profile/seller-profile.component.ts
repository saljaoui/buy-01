import { Component } from '@angular/core';
import { SellerNavComponent } from '../seller-nav/seller-nav.component';

@Component({
  selector: 'app-seller-profile',
  imports: [SellerNavComponent],
  templateUrl: './seller-profile.component.html',
  styleUrl: './seller-profile.component.scss',
})
export class SellerProfileComponent {}
