import { Component, inject } from '@angular/core';
import { SellerNavComponent } from '../../seller-nav/seller-nav.component';
import { ProductService } from '../../../../shared/services/product-service';

@Component({
  selector: 'app-product-form',
  imports: [SellerNavComponent],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductFormComponent {
  private readonly productService = inject(ProductService);
  saveProduct() {
    this.productService.getProducts().subscribe({
      next : (response) => {
      console.log('products : ');
      console.log(response);
      },
      error: (err) => {
        console.error('error : ', err);
        
      }
      
    });
    
  }
}
