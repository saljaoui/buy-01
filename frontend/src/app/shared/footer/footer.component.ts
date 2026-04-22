import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="footer-strip">
      <div class="container">
        <div class="footer-inner">
          <div class="footer-brand">Buy<em>01</em></div>
          <div class="footer-links">
            <a href="#">Collections</a>
            <a href="#">Seller guidelines</a>
            <a href="#">Support</a>
            <a href="#">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {}
