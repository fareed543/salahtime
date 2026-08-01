import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminEmailDetailResponse, EmailsService } from './emails.service';

@Component({
  selector: 'app-emails-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})
export class EmailsDetailsComponent implements OnInit {
  submitted = false;
  isLoading = false;
  isSaving = false;
  feedbackMessage = '';
  errorMessage = '';
  mode: 'create' | 'view' | 'edit' = 'create';
  emailId: number | null = null;
  auditDetails: { createdAt: string; updatedAt: string; templateTitle: string } | null = null;
  templateOptions: Array<{ id: number; label: string }> = [];

  readonly form = this.fb.group({
    name: [''],
    id_email_template: [null as number | null],
    from_name: [''],
    from_email: ['', Validators.email],
    subject: [''],
    cc_email: [''],
    email_content: ['', Validators.required]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly emailsService: EmailsService
  ) {}

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] as 'create' | 'view' | 'edit' ?? 'create';
    this.emailId = Number(this.route.snapshot.paramMap.get('id') || 0) || null;

    if (this.emailId) {
      this.loadEmail(this.emailId);
      return;
    }

    this.loadTemplateOptions();
  }

  get title(): string {
    if (this.mode === 'edit') {
      return 'Edit Email';
    }

    if (this.mode === 'view') {
      return 'View Email';
    }

    return 'Create Email';
  }

  get subtitle(): string {
    if (this.mode === 'edit') {
      return 'Update the selected email content, sender settings, and template reference.';
    }

    if (this.mode === 'view') {
      return 'Review the selected email record and sender details.';
    }

    return 'Create a reusable email configuration for onboarding, alerts, or operational messaging.';
  }

  get isReadOnly(): boolean {
    return this.mode === 'view';
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Emails', route: '/emails' },
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

    this.emailsService.saveEmail({
      id: this.emailId ?? undefined,
      name: rawValue.name?.trim() ?? '',
      id_email_template: rawValue.id_email_template ? Number(rawValue.id_email_template) : null,
      from_name: rawValue.from_name?.trim() ?? '',
      from_email: rawValue.from_email?.trim() ?? '',
      subject: rawValue.subject?.trim() ?? '',
      cc_email: rawValue.cc_email?.trim() ?? '',
      email_content: rawValue.email_content ?? ''
    }).pipe(
      finalize(() => {
        this.isSaving = false;
      })
    ).subscribe({
      next: async (response) => {
        this.feedbackMessage = this.mode === 'create'
          ? 'Email created successfully.'
          : 'Email updated successfully.';
        this.patchForm(response);
        this.auditDetails = this.extractAuditDetails(response);
        if (this.mode === 'create' && response.id) {
          await this.router.navigate(['/emails', response.id, 'edit']);
        }
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to save the email right now.';
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

  private loadEmail(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.emailsService.getEmailById(id).subscribe({
      next: (response) => {
        this.patchForm(response);
        this.templateOptions = response.templateOptions ?? [];
        this.auditDetails = this.extractAuditDetails(response);
        if (this.isReadOnly) {
          this.form.disable();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load email details.';
        this.isLoading = false;
      }
    });
  }

  private loadTemplateOptions(): void {
    this.isLoading = true;
    this.emailsService.getEmails(1, 10, '').subscribe({
      next: (response) => {
        this.templateOptions = response.filterOptions.templates ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private patchForm(response: AdminEmailDetailResponse): void {
    this.form.patchValue({
      name: response.name ?? '',
      id_email_template: response.id_email_template,
      from_name: response.from_name ?? '',
      from_email: response.from_email ?? '',
      subject: response.subject ?? '',
      cc_email: response.cc_email ?? '',
      email_content: response.email_content ?? ''
    });
  }

  private extractAuditDetails(response: AdminEmailDetailResponse): { createdAt: string; updatedAt: string; templateTitle: string } {
    return {
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
      templateTitle: response.templateTitle || 'No template'
    };
  }
}
