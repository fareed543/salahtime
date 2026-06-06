import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { KnowledgeApiService, KnowledgeHadith, KnowledgeTag } from 'src/app/services/knowledge-api.service';

@Component({
  selector: 'app-knowledge-management',
  templateUrl: './knowledge-management.component.html',
  styleUrls: ['./knowledge-management.component.scss']
})
export class KnowledgeManagementComponent implements OnInit {
  tags: KnowledgeTag[] = [];
  hadiths: KnowledgeHadith[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  form = this.createEmptyForm();
  tagForm = {
    name: '',
    code: '',
    sortOrder: 0
  };

  constructor(
    private knowledgeApi: KnowledgeApiService,
    private localStorageService: LocalStorageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userInfo = this.localStorageService.getItem<{ customerTypeId?: number; id_customer_type?: number }>('userInfo');
    const customerTypeId = Number(userInfo?.customerTypeId ?? userInfo?.id_customer_type ?? 0);
    if (customerTypeId !== 1) {
      void this.router.navigate(['/dashboard']);
      return;
    }

    this.loadData();
  }

  editHadith(hadith: KnowledgeHadith): void {
    this.form = {
      id: hadith.id,
      title: hadith.title,
      arabicText: hadith.arabicText,
      referenceSource: hadith.referenceSource,
      referenceLink: hadith.referenceLink,
      ruleType: hadith.ruleType,
      isFarz: hadith.isFarz,
      sortOrder: hadith.sortOrder,
      tagIds: [...hadith.tagIds],
      translations: {
        en: hadith.translations['en'] ?? '',
        te: hadith.translations['te'] ?? '',
        ar: hadith.translations['ar'] ?? '',
        ur: hadith.translations['ur'] ?? ''
      }
    };
    this.successMessage = '';
  }

  toggleTag(tagId: number): void {
    const exists = this.form.tagIds.includes(tagId);
    this.form.tagIds = exists
      ? this.form.tagIds.filter((id) => id !== tagId)
      : [...this.form.tagIds, tagId];
  }

  saveHadith(): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.knowledgeApi.saveHadith(this.form).subscribe({
      next: () => {
        this.successMessage = 'Hadith saved successfully.';
        this.form = this.createEmptyForm();
        this.saving = false;
        this.loadData();
      },
      error: () => {
        this.errorMessage = 'Unable to save hadith right now.';
        this.saving = false;
      }
    });
  }

  deleteHadith(hadith: KnowledgeHadith): void {
    if (!hadith.id) {
      return;
    }

    this.knowledgeApi.deleteHadith(hadith.id).subscribe({
      next: () => {
        this.successMessage = 'Hadith deleted successfully.';
        if (this.form.id === hadith.id) {
          this.form = this.createEmptyForm();
        }
        this.loadData();
      },
      error: () => {
        this.errorMessage = 'Unable to delete hadith right now.';
      }
    });
  }

  saveTag(): void {
    this.knowledgeApi.saveTag(this.tagForm).subscribe({
      next: () => {
        this.tagForm = { name: '', code: '', sortOrder: 0 };
        this.successMessage = 'Tag saved successfully.';
        this.loadData();
      },
      error: () => {
        this.errorMessage = 'Unable to save tag right now.';
      }
    });
  }

  resetForm(): void {
    this.form = this.createEmptyForm();
  }

  private loadData(): void {
    this.loading = true;
    this.knowledgeApi.getManageKnowledge().subscribe({
      next: (response) => {
        this.tags = response.tags ?? [];
        this.hadiths = response.hadiths ?? [];
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load knowledge data right now.';
        this.loading = false;
      }
    });
  }

  private createEmptyForm() {
    return {
      id: 0,
      title: '',
      arabicText: '',
      referenceSource: '',
      referenceLink: '',
      ruleType: '',
      isFarz: false,
      sortOrder: 0,
      tagIds: [] as number[],
      translations: {
        en: '',
        te: '',
        ar: '',
        ur: ''
      }
    };
  }
}
