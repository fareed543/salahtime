import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminEmailTemplateDetailResponse, EmailTemplatesService } from './email-templates.service';

@Component({
  selector: 'app-email-templates-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})
export class EmailTemplatesDetailsComponent implements OnInit {
  submitted = false;
  isLoading = false;
  isSaving = false;
  feedbackMessage = '';
  errorMessage = '';
  mode: 'create' | 'view' | 'edit' = 'create';
  templateId: number | null = null;
  auditDetails: { createdAt: string; updatedAt: string; linkedEmailCount: number } | null = null;

  readonly form = this.fb.group({
    title: ['', Validators.required],
    email_template: ['', Validators.required]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly emailTemplatesService: EmailTemplatesService
  ) {}

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] as 'create' | 'view' | 'edit' ?? 'create';
    this.templateId = Number(this.route.snapshot.paramMap.get('id') || 0) || null;

    if (this.templateId) {
      this.loadTemplate(this.templateId);
    }
  }

  get title(): string {
    if (this.mode === 'edit') {
      return 'Edit Email Template';
    }

    if (this.mode === 'view') {
      return 'View Email Template';
    }

    return 'Create Email Template';
  }

  get subtitle(): string {
    if (this.mode === 'edit') {
      return 'Update the selected email template markup and metadata.';
    }

    if (this.mode === 'view') {
      return 'Review the selected email template before using it in email records.';
    }

    return 'Create a reusable email template for transactional and operational mail.';
  }

  get isReadOnly(): boolean {
    return this.mode === 'view';
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Email Templates', route: '/email-templates' },
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

    this.emailTemplatesService.saveEmailTemplate({
      id: this.templateId ?? undefined,
      title: rawValue.title?.trim() ?? '',
      email_template: rawValue.email_template ?? ''
    }).pipe(
      finalize(() => {
        this.isSaving = false;
      })
    ).subscribe({
      next: async (response) => {
        this.feedbackMessage = this.mode === 'create'
          ? 'Email template created successfully.'
          : 'Email template updated successfully.';
        this.patchForm(response);
        this.auditDetails = this.extractAuditDetails(response);
        if (this.mode === 'create' && response.id) {
          await this.router.navigate(['/email-templates', response.id, 'edit']);
        }
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to save the email template right now.';
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

  private loadTemplate(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.emailTemplatesService.getEmailTemplateById(id).subscribe({
      next: (response) => {
        this.patchForm(response);
        this.auditDetails = this.extractAuditDetails(response);
        if (this.isReadOnly) {
          this.form.disable();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load email template details.';
        this.isLoading = false;
      }
    });
  }

  private patchForm(response: AdminEmailTemplateDetailResponse): void {
    this.form.patchValue({
      title: response.title ?? '',
      email_template: response.email_template ?? ''
    });
  }

  private extractAuditDetails(response: AdminEmailTemplateDetailResponse): { createdAt: string; updatedAt: string; linkedEmailCount: number } {
    return {
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
      linkedEmailCount: response.linkedEmailCount
    };
  }
}
