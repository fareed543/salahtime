import { AfterViewInit, Component, signal } from '@angular/core';
import { LayoutService } from './layout.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  menuOpen : boolean = false;
  protected readonly title = signal('salah-time-board');

  constructor(private layoutService: LayoutService) {}


  ngAfterViewInit() {
    this.layoutService.setPreload(true);
    this.layoutService.setResizingHandlers();
    this.layoutService.setupMenuToggles();
  }

  toggleSidebar(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.layoutService.toggleSidebar();
  }

  closeMenuOnMobile(event: Event) {
    if (window.innerWidth <= 768) {
      this.layoutService.toggleSidebar();
    }
  }
}
