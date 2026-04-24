import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { ProductResponse, ProductService } from '../../../shared/services/product-service';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, FooterComponent, NavbarComponent],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductListComponent implements OnInit {
  ngOnInit(): void {
    this.loadProducts();
  }
  private readonly productService = inject(ProductService);
  productListSignal = signal<ProductResponse[] | null>(null);
  productList = computed(() => this.productListSignal());
  protected scrollCatalog(): void {
    const element = document.getElementById('catalog');
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  loadProducts() {
    this.productService.getProducts().subscribe({
      next: (response: ProductResponse[]) => {
        if (response) {
          this.productListSignal.set(response);
        }
      },
      error: (err) => {
        console.error('error: ', err);
      }
    })
  }
}
