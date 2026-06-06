import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { DialogConfig, DialogService } from 'src/app/services/dialog.service';

@Component({
  selector: 'app-dialog-host',
  templateUrl: './dialog-host.component.html',
  styleUrls: ['./dialog-host.component.scss']
})
export class DialogHostComponent {
  readonly dialog$: Observable<DialogConfig | null>;

  constructor(private dialogService: DialogService) {
    this.dialog$ = this.dialogService.dialog$;
  }

  close(): void {
    this.dialogService.close();
  }

  onBackdropClick(dialog: DialogConfig): void {
    if (dialog.closeOnBackdrop !== false) {
      this.close();
    }
  }
}
