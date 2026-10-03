import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { CommunityService, OptionItem, ProgramDetail } from './community.service';

function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value;
  const end = group.get('endDate')?.value;
  return start && end && end < start ? { endBeforeStart: true } : null;
}

@Component({
  selector: 'app-program-details',
  templateUrl: './program-details.component.html',
  styleUrls: ['./community.scss']
})
export class ProgramDetailsComponent implements OnInit {
  recordId = 0;
  isReadOnly = true;
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  feedbackMessage = '';
  record: ProgramDetail | null = null;
  halqas: OptionItem[] = [];

  readonly form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    programType: ['general'],
    status: ['active'],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    idHalqa: [null as number | null, Validators.required],
    contactNumber: [''],
    email: ['', Validators.email],
    description: [''],
    registrationAllowed: [true],
    waitlistEnabled: [true],
    maxParticipants: [100, [Validators.required, Validators.min(1)]]
  }, { validators: endAfterStart });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly community: CommunityService
  ) {}

  get title(): string {
    return this.isReadOnly ? (this.record?.name || 'Program') : `Edit ${this.record?.name || 'program'}`;
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Programs', route: '/community/programs' },
      { label: this.isReadOnly ? 'Details' : 'Edit' }
    ];
  }

  get totalMembers(): number {
    const members = this.record?.members;
    return members ? members.organizers + members.volunteers + members.subscribers : 0;
  }

  ngOnInit(): void {
    this.community.halqaOptions().subscribe({ next: (options) => this.halqas = options, error: () => this.halqas = [] });

    this.route.paramMap.subscribe((params) => {
      this.recordId = Number(params.get('id'));
      this.isReadOnly = this.route.snapshot.data['mode'] !== 'edit';
      this.feedbackMessage = '';
      this.load();
    });
  }

  hasError(control: string, error: string): boolean {
    const field = this.form.get(control);
    return !!field && field.touched && field.hasError(error);
  }

  submit(): void {
    if (this.isReadOnly || this.isSaving) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage = 'Please fix the highlighted fields.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.community.saveProgram(this.recordId, this.form.getRawValue())
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (response) => {
          this.feedbackMessage = response.message || 'Program saved successfully.';
          void this.router.navigate(['/community/programs', this.recordId]);
        },
        error: (error) => this.errorMessage = error?.error?.error || 'Unable to save the program.'
      });
  }

  private load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.community.program(this.recordId)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (record) => {
          this.record = record;
          this.form.patchValue({
            name: record.name,
            code: record.code,
            programType: record.programType,
            status: record.status || 'active',
            startDate: record.startDate,
            endDate: record.endDate,
            idHalqa: record.idHalqa || null,
            contactNumber: record.contactNumber,
            email: record.email,
            description: record.description,
            registrationAllowed: record.registrationAllowed,
            waitlistEnabled: record.waitlistEnabled,
            maxParticipants: record.maxParticipants
          });
          this.form.markAsPristine();
          if (this.isReadOnly) {
            this.form.disable();
          } else {
            this.form.enable();
          }
        },
        error: (error) => this.errorMessage = error?.error?.error || 'Unable to load the program.'
      });
  }
}
