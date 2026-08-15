import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AppTranslateService } from 'src/app/services/translate.service';

@Component({
  selector: 'app-language-selection',
  templateUrl: './language-selection.component.html',
  styleUrls: ['./language-selection.component.scss']
})
export class LanguageSelectionComponent implements OnInit {
  @Input() dialogMode = false;
  @Output() selected = new EventEmitter<string>();

  langs: string[] = [];

  // Make i18n public so template can access it
  constructor(public i18n: AppTranslateService) {}

  ngOnInit(): void {
    this.langs = this.i18n.available();
  }

  changeLang(lang: string): void {
    this.i18n.use(lang);
    this.selected.emit(lang);
  }
}
