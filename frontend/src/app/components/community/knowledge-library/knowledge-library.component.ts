import { Component, OnInit } from '@angular/core';
import { AppTranslateService } from 'src/app/services/translate.service';
import { KnowledgeApiService, KnowledgeHadith, KnowledgeTag } from 'src/app/services/knowledge-api.service';

@Component({
  selector: 'app-knowledge-library',
  templateUrl: './knowledge-library.component.html',
  styleUrls: ['./knowledge-library.component.scss']
})
export class KnowledgeLibraryComponent implements OnInit {
  tags: KnowledgeTag[] = [];
  hadiths: KnowledgeHadith[] = [];
  loading = true;
  errorMessage = '';
  selectedTags: number[] = [];
  selectedRuleType = '';
  searchText = '';

  constructor(
    public i18n: AppTranslateService,
    private knowledgeApi: KnowledgeApiService
  ) {}

  ngOnInit(): void {
    this.loadKnowledge();
  }

  toggleTag(tagId: number): void {
    this.selectedTags = this.selectedTags.includes(tagId)
      ? this.selectedTags.filter((id) => id !== tagId)
      : [...this.selectedTags, tagId];
    this.loadKnowledge();
  }

  onRuleTypeChange(): void {
    this.loadKnowledge();
  }

  clearFilters(): void {
    this.selectedTags = [];
    this.selectedRuleType = '';
    this.searchText = '';
    this.loadKnowledge();
  }

  getMeaning(hadith: KnowledgeHadith): string {
    const lang = this.i18n.current();
    return hadith.translations[lang] || hadith.translations['en'] || hadith.translations['ur'] || '';
  }

  private loadKnowledge(): void {
    this.loading = true;
    this.errorMessage = '';
    const selectedTagCodes = this.tags
      .filter((tag) => this.selectedTags.includes(tag.id))
      .map((tag) => tag.code);

    this.knowledgeApi.getKnowledge({
      tags: selectedTagCodes,
      ruleType: this.selectedRuleType,
      search: this.searchText.trim()
    }).subscribe({
      next: (response) => {
        this.tags = response.tags ?? this.tags;
        this.hadiths = response.hadiths ?? [];
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load knowledge right now.';
        this.loading = false;
      }
    });
  }
}
