import { Component } from '@angular/core';
import { SellerNavComponent } from '../seller-nav/seller-nav.component';

@Component({
  selector: 'app-media-manager',
  imports: [SellerNavComponent],
  templateUrl: './media-manager.component.html',
  styleUrl: './media-manager.component.scss',
})
export class MediaManagerComponent {}
