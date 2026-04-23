import { Component } from '@angular/core';
import { SellerNavComponent } from '../seller/seller-nav/seller-nav.component';

@Component({
  selector: 'app-dashboard',
  imports: [SellerNavComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {}
