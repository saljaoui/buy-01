import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiClient } from '../../../core/api/api-client.service';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { ProductResponse, ProductService } from '../../../shared/services/product-service';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, FooterComponent, NavbarComponent, IconComponent],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductListComponent implements OnInit {
  ngOnInit(): void {
    this.loadProducts();
  }
  private readonly productService = inject(ProductService);
  private readonly api = inject(ApiClient);

  productListSignal = signal<ProductResponse[]>([]);
  productList = computed(() => this.productListSignal());
  productCount = computed(() => this.productList().length);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  protected scrollCatalog(): void {
    const element = document.getElementById('catalog');
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  loadProducts() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.productService.getProducts().subscribe({
      next: (response: ProductResponse[]) => {
        this.productListSignal.set(response ?? []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(
          this.api.getErrorMessage(err, 'Unable to load products right now.'),
        );
        this.isLoading.set(false);
      }
    })
  }

  getProductImageUrl(productId: string): string {
    return this.productService.getPrimaryImageUrl(productId);
  }
}
