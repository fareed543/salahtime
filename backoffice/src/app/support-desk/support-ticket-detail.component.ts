import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { STATUS_BADGES, SupportAttachment, SupportDeskService, SupportOption, SupportTicketDetail, SupportTicketStatus } from './support-desk.service';

const SITE_URL = 'https://salah-times.in';

@Component({
  selector: 'app-support-ticket-detail',
  templateUrl: './support-ticket-detail.component.html',
  styleUrls: ['../community/community.scss', './support-desk.scss']
})
export class SupportTicketDetailComponent implements OnInit, OnDestroy {
  ticket: SupportTicketDetail | null = null;
  /** Attachment id -> object URL of the fetched file. */
  private readonly fileUrls = new Map<number, string>();
  readonly failedFiles = new Set<number>();
  statuses: SupportOption[] = [];
  isLoading = true;
  isSaving = false;
  errorMessage = '';

  readonly form = this.fb.nonNullable.group({
    status: 'new' as SupportTicketStatus,
    adminNote: ''
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder,
    private readonly supportDesk: SupportDeskService,
    private readonly toast: ToastService
  ) {}

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Support Desk', route: '/support-desk' },
      { label: this.ticket?.reference ?? 'Issue' }
    ];
  }

  get contextRows(): Array<{ label: string; value: string }> {
    const context = this.ticket?.context ?? {};
    return Object.entries(context).map(([key, value]) => ({
      label: key.replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase()),
      value: typeof value === 'object' && value !== null
        ? Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(', ')
        : String(value)
    }));
  }

  /** The page the user reported from, on the live site. */
  get pageLink(): string | null {
    const path = this.ticket?.pageUrl;
    return path && path.startsWith('/') ? SITE_URL + path : null;
  }

  get replyLink(): string | null {
    if (!this.ticket?.email) {
      return null;
    }
    const subject = encodeURIComponent(`Re: your SalahTime report ${this.ticket.reference}`);
    return `mailto:${this.ticket.email}?subject=${subject}`;
  }

  ngOnInit(): void {
    this.supportDesk.options().subscribe({ next: options => this.statuses = options.statuses });
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.supportDesk.getTicket(id)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: ticket => this.setTicket(ticket),
        error: error => this.errorMessage = error?.error?.error || 'Unable to load this issue.'
      });
  }

  badgeFor(status: SupportTicketStatus): string {
    return STATUS_BADGES[status] ?? 'bg-label-secondary';
  }

  save(): void {
    if (!this.ticket || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.supportDesk.updateTicket(this.ticket.id, this.form.getRawValue())
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: ticket => {
          this.setTicket(ticket);
          this.toast.success('Issue updated.');
        },
        error: error => this.toast.error(error, 'Unable to update this issue.')
      });
  }

  ngOnDestroy(): void {
    this.releaseFiles();
  }

  /** Object URL of a loaded attachment, for the thumbnail / open / download links. */
  fileUrl(attachment: SupportAttachment): string | null {
    return this.fileUrls.get(attachment.id) ?? null;
  }

  formatSize(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private setTicket(ticket: SupportTicketDetail): void {
    const sameFiles = this.ticket?.id === ticket.id;
    this.ticket = ticket;
    this.form.reset({ status: ticket.status, adminNote: ticket.adminNote ?? '' });
    if (!sameFiles) {
      this.loadFiles(ticket.attachments ?? []);
    }
  }

  /** Files need the admin token, so each one is fetched and shown from memory. */
  private loadFiles(attachments: SupportAttachment[]): void {
    this.releaseFiles();
    attachments.forEach(attachment => {
      this.supportDesk.getAttachment(attachment.id).subscribe({
        next: blob => this.fileUrls.set(attachment.id, URL.createObjectURL(blob)),
        error: () => this.failedFiles.add(attachment.id)
      });
    });
  }

  private releaseFiles(): void {
    this.fileUrls.forEach(url => URL.revokeObjectURL(url));
    this.fileUrls.clear();
    this.failedFiles.clear();
  }
}
