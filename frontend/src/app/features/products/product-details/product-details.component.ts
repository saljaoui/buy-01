import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { ProductResponse, ProductService } from '../../../shared/services/product-service';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaService, MediaUploadData } from '../../../shared/services/media-service';
import { ToastService } from '../../../shared/services/toast-service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-product-details',
  imports: [FooterComponent, NavbarComponent],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
})
export class ProductDetailsComponent implements OnInit {
  productDetailsSignal = signal<ProductResponse | undefined>(undefined);
  productDetails = computed(() => this.productDetailsSignal());

  MediasDetailsSignal = signal<MediaUploadData[] | undefined>(undefined);
  MediaDetails = computed(() => this.MediasDetailsSignal());

  selectedImageSignal = signal<MediaUploadData | undefined>(undefined);
  selectedImage = computed(() => this.selectedImageSignal());

 

  productId: string = '';
  private readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly mediaService = inject(MediaService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);



  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const productId = params.get('id');
      console.log('id: ', productId);
      if (productId) { 
        this.productId = productId;      
      }
    });
    this.findProduct();
    this.loadMedia();
  }
  findProduct() {
    this.productService.getProduct(this.productId).subscribe({
      next: (response: ProductResponse) => {
        console.log('product: ', response);
        this.productDetailsSignal.set(response);
      },
      error: (err: HttpErrorResponse) => {
        switch (err.status) {
          case 404:
            this.toastService.error('The product you’re looking for doesn’t exist or may have been removed.');
            this.router.navigate(['/not-found']);
            break;
        
          default:
            break;
        }
        console.error('error: ', err);
      }
    })
  }
  loadMedia() {
    this.mediaService.getMediaByPost(this.productId).subscribe({
      next: (response: MediaUploadData[]) => {
        this.MediasDetailsSignal.set(response);
        if (this.MediaDetails()?.[0]) {
          this.selectedImageSignal.set(this.MediaDetails()?.[0]);
        }
      },
      error: (err) => {
        console.error('error: ', err);
      }
    })
  }
  selectImage(selectedId: any) {
    const selectedImage = this.MediaDetails()?.filter((media) => {
      return media.id == selectedId;
    })[0];
    this.selectedImageSignal.set(selectedImage);
  }
  updateProduct() {
    this.router.navigate(['/seller/products', this.productId, 'edit']);
  }

  delete() {
    this.productService.deleteProduct(this.productId).subscribe({
      next: (response) => {
        this.toastService.success("product deleted successfuly");
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.toastService.error("product doesn't deleted!");
      }
    })
  }
}
