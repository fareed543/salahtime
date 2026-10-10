import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { STATUS_BADGES, SupportDeskService, SupportOption, SupportTicketDetail, SupportTicketStatus } from './support-desk.service';

const SITE_URL = 'https://salah-times.in';

@Component({
  selector: 'app-support-ticket-detail',
  templateUrl: './support-ticket-detail.component.html',
  styleUrls: ['../community/community.scss', './support-desk.scss']
})
export class SupportTicketDetailComponent implements OnInit {
  ticket: SupportTicketDetail | null = null;
  statuses: SupportOption[] = [];
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  feedbackMessage = '';

  readonly form = this.fb.nonNullable.group({
    status: 'new' as SupportTicketStatus,
    adminNote: ''
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder,
    private readonly supportDesk: SupportDeskService
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
    this.errorMessage = '';
    this.feedbackMessage = '';
    this.supportDesk.updateTicket(this.ticket.id, this.form.getRawValue())
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: ticket => {
          this.setTicket(ticket);
          this.feedbackMessage = 'Issue updated.';
        },
        error: error => this.errorMessage = error?.error?.error || 'Unable to update this issue.'
      });
  }

  private setTicket(ticket: SupportTicketDetail): void {
    this.ticket = ticket;
    this.form.reset({ status: ticket.status, adminNote: ticket.adminNote ?? '' });
  }
}
