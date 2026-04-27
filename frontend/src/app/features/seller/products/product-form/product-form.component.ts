import { Component, inject } from '@angular/core';
import { SellerNavComponent } from '../../seller-nav/seller-nav.component';
import { ProductRequest, ProductService } from '../../../../shared/services/product-service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-form',
  imports: [SellerNavComponent, FormsModule],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductFormComponent {
  private readonly productService = inject(ProductService);

  productInfo: ProductRequest = {
    name:'',
    description:'',
    price:0,
    quantity:0
  };
  saveProduct() {
    this.productService.publishProduct(this.productInfo).subscribe({
      next : (response) => {
      },
      error: (err) => {
        console.error('error : ', err);
      }
    });
  }

  printProductInfo() {
    if (this.productInfo) {
      console.log('name : ', this.productInfo.name);
      console.log('description : ', this.productInfo.description);
      console.log('price : ', this.productInfo.price);
      console.log('quantity : ', this.productInfo.quantity);
      return;
    }
    console.log('product is null');
  }
}
