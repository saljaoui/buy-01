import { Component } from '@angular/core';
<<<<<<< HEAD

@Component({
  selector: 'app-seller-profile',
  imports: [],
=======
import { SellerNavComponent } from '../seller-nav/seller-nav.component';

@Component({
  selector: 'app-seller-profile',
  imports: [SellerNavComponent],
>>>>>>> main
  templateUrl: './seller-profile.component.html',
  styleUrl: './seller-profile.component.scss',
})
export class SellerProfileComponent {}
