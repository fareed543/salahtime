import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminLanguageItem, LanguagesService } from './languages.service';

@Component({
  selector: 'app-language-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})
export class LanguageDetailsComponent implements OnInit {
  submitted = false;
  isLoading = false;
  isSaving = false;
  feedbackMessage = '';
  errorMessage = '';
  mode: 'create' | 'view' | 'edit' = 'create';
  languageId: number | null = null;
  auditDetails: { createdAt: string; updatedAt: string } | null = null;

  readonly form = this.fb.group({
    name: ['', Validators.required],
    native_name: [''],
    code: ['', Validators.required],
    sort_order: [1, Validators.required],
    status: [true]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly languagesService: LanguagesService
  ) {}

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] as 'create' | 'view' | 'edit' ?? 'create';
    this.languageId = Number(this.route.snapshot.paramMap.get('id') || 0) || null;

    if (this.languageId) {
      this.loadLanguage(this.languageId);
    }
  }

  get title(): string {
    if (this.mode === 'edit') {
      return 'Edit Language';
    }

    if (this.mode === 'view') {
      return 'View Language';
    }

    return 'Create Language';
  }

  get subtitle(): string {
    if (this.mode === 'edit') {
      return 'Update the backend language record used by back office modules.';
    }

    if (this.mode === 'view') {
      return 'Review the selected backend language record and status.';
    }

    return 'Create a backend-only language entry so offline modules can run independently of the frontend app.';
  }

  get isReadOnly(): boolean {
    return this.mode === 'view';
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Languages', route: '/languages' },
      { label: this.title }
    ];
  }

  submit(): void {
    if (this.isReadOnly || this.isSaving) {
      return;
    }

    this.submitted = true;
    this.feedbackMessage = '';
    this.errorMessage = '';
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const rawValue = this.form.getRawValue();
    this.isSaving = true;

    this.languagesService.saveLanguage({
      id: this.languageId ?? undefined,
      name: rawValue.name?.trim() ?? '',
      native_name: rawValue.native_name?.trim() ?? '',
      code: rawValue.code?.trim().toLowerCase() ?? '',
      status: !!rawValue.status,
      sort_order: Number(rawValue.sort_order ?? 0)
    }).pipe(
      finalize(() => {
        this.isSaving = false;
      })
    ).subscribe({
      next: async (response) => {
        this.feedbackMessage = this.mode === 'create'
          ? 'Language created successfully.'
          : 'Language updated successfully.';
        this.patchForm(response);
        this.auditDetails = this.extractAuditDetails(response);
        if (this.mode === 'create' && response.id) {
          await this.router.navigate(['/languages', response.id, 'edit']);
        }
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to save the language right now.';
      }
    });
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && control.hasError(errorName);
  }

  formatAuditDate(value: string | null | undefined): string {
    if (!value) {
      return 'Not available';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  private loadLanguage(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.languagesService.getLanguageById(id).subscribe({
      next: (response) => {
        this.patchForm(response);
        this.auditDetails = this.extractAuditDetails(response);
        if (this.isReadOnly) {
          this.form.disable();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load language details.';
        this.isLoading = false;
      }
    });
  }

  private patchForm(response: AdminLanguageItem): void {
    this.form.patchValue({
      name: response.name ?? '',
      native_name: response.nativeName ?? '',
      code: response.code ?? '',
      sort_order: response.sortOrder ?? 1,
      status: !!response.status
    });
  }

  private extractAuditDetails(response: AdminLanguageItem): { createdAt: string; updatedAt: string } {
    return {
      createdAt: response.createdAt,
      updatedAt: response.updatedAt
    };
  }
}
