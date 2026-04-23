import { Component } from '@angular/core';
import { SellerNavComponent } from '../../seller-nav/seller-nav.component';

@Component({
  selector: 'app-product-form',
  imports: [SellerNavComponent],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductFormComponent {}
