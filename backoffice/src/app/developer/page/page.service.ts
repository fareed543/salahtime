import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PageItem } from './page-item.model';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PageService {
  constructor(private http: HttpClient){}
  private pages = new BehaviorSubject<PageItem[]>([
    {
      id: 1,
      title: 'Home',
      heading: 'Welcome to Home',
      subHeading: 'Subheading for Home',
      description: 'Home page content',
      shortDescription: 'Short home intro',
      image: '',
      tags: ['home'],
      parentId: null,
      children: [],
      open: false
    }
  ]);

  getPages(): Observable<PageItem[]> {
    return this.pages.asObservable();
  }

  savePage(updatedPage: PageItem): Observable<any> {
    return this.http.post(
      'http://walletplus.in/oneportaladmin/save-page.php',
      updatedPage
    );
  }


updatePageInTree(list: PageItem[], updated: PageItem): boolean {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === updated.id) {
      list[i] = updated;
      return true;
    }

    const children = list[i].children;
    if (children && children.length > 0) {
      if (this.updatePageInTree(children, updated)) {  // ✅ TS now knows children is PageItem[]
        return true;
      }
    }
  }
  return false;
}


}
