import { Component, inject, OnDestroy } from '@angular/core';
import { SellerNavComponent } from '../../seller-nav/seller-nav.component';
import { ProductRequest, ProductService } from '../../../../shared/services/product-service';
import { FormsModule } from '@angular/forms';
import { MediaService } from '../../../../shared/services/media-service';
import { ToastService } from '../../../../shared/services/toast-service';

@Component({
  selector: 'app-product-form',
  imports: [SellerNavComponent, FormsModule],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductFormComponent implements OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly mediaService = inject(MediaService);
  private readonly toasrService = inject(ToastService);

  selectedFilesArray: File[] = [];

  productInfo: ProductRequest = {
    name: '',
    description: '',
    price: 0,
    quantity: 0
  };
  saveProduct() {

    if (this.selectedFilesArray.length == 0) {
      this.toasrService.error("product most have at least one Image");
      return;
    }
    this.productService.publishProduct(this.productInfo).subscribe({
      next: (product: any) => {
        console.log("product created with id = ", product.id);
        this.mediaService.publishMedia(product.id, this.selectedFilesArray).subscribe({
          next: (response: any) => {
            console.log('response: ', response);
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

  selectedFiles: { file: File; preview: string }[] = [];

  onFilesSelected(event: any): void {
    if (this.selectedFilesArray.length == 3) {
      return;
    }
    const files: File[] = Array.from(event.target.files);
    const mappedFiles = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    this.selectedFiles.push(...mappedFiles);
    this.selectedFilesArray.push(files[0]);
    event.target.value = '';
  }

  deleteImage(fileToDelete: File): void {
    const item = this.selectedFiles.find(
      item => item.file === fileToDelete
    );
    if (item) {
      URL.revokeObjectURL(item.preview);
    }
    this.selectedFiles = this.selectedFiles.filter(
      item => item.file !== fileToDelete
    );
    
  }

  ngOnDestroy(): void {
    this.selectedFiles.forEach(item => {
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
}
