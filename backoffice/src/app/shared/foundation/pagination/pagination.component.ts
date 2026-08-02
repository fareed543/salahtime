import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-foundation-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class FoundationPaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() pageNumbers: number[] = [];
  @Output() pageChange = new EventEmitter<number>();

  isEllipsis(pageNumber: number): boolean {
    return pageNumber === -1;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.pageChange.emit(page);
  }
}
