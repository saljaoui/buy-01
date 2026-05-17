import { ChangeDetectorRef, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { SellerNavComponent } from '../../seller-nav/seller-nav.component';
import { ProductImage, ProductRequest, ProductResponse, ProductService } from '../../../../shared/services/product-service';
import { FormsModule } from '@angular/forms';
import { MediaService, MediaUploadData } from '../../../../shared/services/media-service';
import { ToastService } from '../../../../shared/services/toast-service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-product-form',
  imports: [SellerNavComponent, FormsModule],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductFormComponent implements OnInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly mediaService = inject(MediaService);
  private readonly toasrService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);


  mode: 'create' | 'edit' = 'create';
  productDetailsSignal = signal<ProductResponse | undefined>(undefined);
  productDetails = computed(() => this.productDetailsSignal());

  MediasDetailsSignal = signal<MediaUploadData[] | undefined>(undefined);
  MediaDetails = computed(() => this.MediasDetailsSignal());
  selectedFilesArray: File[] = [];

  productId = signal<string>('');

  selectedImages: ProductImage[] = [];

  productInfo: ProductRequest = {
    name: '',
    description: '',
    price: 0,
    quantity: 100
  };

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const productId = params.get('id');
      console.log('before ... is');
      if (productId) {
        console.log('yeah...');
        this.productId.set(productId);
        this.mode = 'edit';
        this.loadProductData();
        this.loadMediaData();

      }
    });
  }

  saveProduct() {
    if (this.selectedImages.length == 0) {
      this.toasrService.error("product most have at least one Image");
      return;
    }
    if (this.mode === 'edit') {
      this.productService.updateProduct(this.productId(), this.productInfo).subscribe({
        next: (response) => {
          this.mediaService.updateMedia(this.productId(), this.selectedImages).subscribe({
            next: (response) => {
              console.log('response: ', response);
            },
            error: (err) => {
              console.error('error: ', err);
            }
          });
        },
        error: (err) => {
          console.error("error: ", err);
        }
      });
    } else {
      this.productService.publishProduct(this.productInfo).subscribe({
        next: (product: any) => {
          console.log("product created with id = ", product.id);
          this.selectedFilesArray = this.selectedImages.map((m) => m.file);
          this.mediaService.publishMedia(product.id, this.selectedFilesArray).subscribe({
            next: (response: any) => {
              console.log('response: ', response);
              this.router.navigate(['/products']);
            },
            error: (err) => {
              console.error('error: ', err);
            }
          });
        },
        error: (err) => {
          console.error('error : ', err);
        }
      });
    }
  }

  onFilesSelected(event: any): void {
    if (this.selectedImages.length == 3) {
      return;
    }
    const files: File[] = Array.from(event.target.files);
    const mappedFiles: ProductImage[] = files.map(file => ({
      id: '',
      isNew: true,
      deleted: false,
      file,
      preview: URL.createObjectURL(file)
    }));

    this.selectedImages = [...this.selectedImages, ...mappedFiles];
    event.target.value = '';
    console.log('images: ', this.selectedImages);
  }

  deleteImage(fileToDelete: ProductImage): void {
    const item = this.selectedImages.find(
      item => item === fileToDelete
    );
    if (item) {
      URL.revokeObjectURL(item.preview);
    }
    this.selectedImages = this.selectedImages.filter(
      item => item !== fileToDelete
    );

  }

  ngOnDestroy(): void {
    this.selectedImages.forEach(item => {
      URL.revokeObjectURL(item.preview);
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


  getPreview(file: File): string {
    return URL.createObjectURL(file);
  }


  loadProductData() {
    this.productService.getProduct(this.productId()).subscribe({
      next: (response: ProductResponse) => {
        this.productDetailsSignal.set(response);
        this.productInfo.name = response.name;
        this.productInfo.description = response.description;
        this.productInfo.price = response.price;
        this.productInfo.quantity = response.quantity;
        this.cdr.detectChanges();
        console.log('productInfo : ', this.productInfo);
      },
      error: (err: ProductResponse) => {
        console.error('error: ', err);
      }
    })
  }

  loadMediaData() {
    this.mediaService.getMediaByPost(this.productId()).subscribe({
      next: (response: MediaUploadData[]) => {
        console.log('response: ', response);
        response.forEach((media) => {
          const file = this.rawBase64ToFile(
            media.base64Image,
            `image-${media.id}`,
            media.contentType
          );
          this.selectedImages.push({
            id: media.id,
            file: file,
            preview: URL.createObjectURL(file),
            isNew: false,
            deleted: false
          });
        })
        this.MediasDetailsSignal.set(response);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('error: ', err);
      }
    })
  }

  rawBase64ToFile(
    base64: string,
    filename: string,
    mimeType: string
  ): File {
    const byteString = atob(base64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }

    return new File([intArray], filename, { type: mimeType });
  }
}
