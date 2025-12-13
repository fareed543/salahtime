import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
private renderer: Renderer2;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  setPreload(remove = true) {
    const body = document.body;
    if (remove) {
      setTimeout(() => this.renderer.removeClass(body, 'is-preload'), 100);
    } else {
      this.renderer.addClass(body, 'is-preload');
    }
  }

  setResizingHandlers() {
    const body = document.body;
    let resizeTimeout: any;

    window.addEventListener('resize', () => {
      this.renderer.addClass(body, 'is-resizing');
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.renderer.removeClass(body, 'is-resizing');
      }, 100);
    });
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      if (sidebar.classList.contains('inactive')) {
        this.renderer.removeClass(sidebar, 'inactive');
      } else {
        this.renderer.addClass(sidebar, 'inactive');
      }
    }
  }


  setupMenuToggles() {
    const openers = document.querySelectorAll('#menu .opener');
    openers.forEach(opener => {
      opener.addEventListener('click', (e) => {
        e.preventDefault();
        openers.forEach(o => o.classList.remove('active'));
        opener.classList.toggle('active');
      });
    });
  }
}

