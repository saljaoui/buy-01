import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, FooterComponent, NavbarComponent],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductListComponent {
  protected scrollCatalog(): void {
    const element = document.getElementById('catalog');
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
