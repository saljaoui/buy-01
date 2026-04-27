import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { ProductResponse, ProductService } from '../../../shared/services/product-service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-product-details',
  imports: [FooterComponent, NavbarComponent],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
})
export class ProductDetailsComponent implements OnInit {
  productDetailsSignal = signal<ProductResponse | undefined>(undefined);
  productDetails = computed(() => this.productDetailsSignal());
  productId: string = '';
  private readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const productId = params.get('id');
      if (productId) {
        this.productId = productId;
      }
    });
    this.findProduct();
  }

  findProduct() {
    this.productService.getProduct(this.productId).subscribe({
      next: (response: ProductResponse) => {
        this.productDetailsSignal.set(response);
      },
      error: (err: ProductResponse) => {
        console.error('error: ', err);
      }
    })
  }

  updateProduct() {
    
  }
}
