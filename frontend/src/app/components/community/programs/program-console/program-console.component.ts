import { Component, HostListener, Input, OnChanges, SimpleChanges } from '@angular/core';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { NotifyService } from 'src/app/services/notify.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { PickedMasjid } from 'src/app/shared/masjid-picker/masjid-picker.component';
import { getProgramId, getProgramType, isProgramExpired } from '../program-utils';

export type ConsoleTab = 'members' | 'distribution' | 'stats';
type GenderFilter = '' | 'm' | 'f';
type RoleFilter = 'all' | 'volunteers' | 'subscribers' | 'waitlist';

export const EMPLOYMENT_STATUSES = ['employed', 'self_employed', 'student', 'not_working', 'retired'] as const;

interface PacketRow {
  id: number;
  firstname: string;
  lastname: string;
  image: string | null;
  gender: string | null;
  phone: string;
  packets: number | null;
  token: number | null;
  recorded_by_name: string | null;
}

/**
 * NF-012 program console under the program details: Members, Distribution (daily packets) and
 * Stats for the program's admin and volunteers; a same-gender member list for subscribers.
 * Every permission is enforced again by the API.
 */
@Component({
  selector: 'app-program-console',
  templateUrl: './program-console.component.html',
  styleUrls: ['./program-console.component.scss']
})
export class ProgramConsoleComponent implements OnChanges {
  @Input() program: any = null;

  tab: ConsoleTab = 'members';
  readonly employmentStatuses = EMPLOYMENT_STATUSES;

  /* members */
  membersLoading = false;
  members: any[] = [];
  counts: any = null;
  viewerRole: 'admin' | 'volunteer' | 'subscriber' | null = null;
  needsGender = false;
  genderFilter: GenderFilter = '';
  roleFilter: RoleFilter = 'all';
  memberQuery = '';
  openMenuId: number | null = null;
  imagePath = '';

  /* add member */
  addOpen = false;
  addQuery = '';
  addResults: any[] = [];
  addSearching = false;
  newMember = { firstname: '', lastname: '', phone: '', gender: '' };
  addingNew = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  /* edit member profile */
  editing: any = null;
  editHistory: any[] = [];
  editLoading = false;
  editSaving = false;
  editForm: Record<string, any> = {};
  editMasjidChanged = false;

  /* distribution */
  packetDate = this.today();
  packetGender: GenderFilter = '';
  packetRows: PacketRow[] = [];
  packetTotals = { members: 0, entered: 0, packets: 0 };
  packetEditable = false;
  packetsLoading = false;
  packetsSaving = false;
  packetQuery = '';
  packetEditing: PacketRow | null = null;
  packetDraft: { packets: number; token: string } = { packets: 1, token: '' };

  constructor(
    private ramadanApi: RamadanApiService,
    private notify: NotifyService,
    private i18n: AppTranslateService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    const previous = changes['program']?.previousValue;
    if (changes['program'] && getProgramId(previous) !== this.programId) {
      this.viewerRole = this.program?.viewer_role ?? null;
      this.tab = this.isTeam && this.isMealProgram && !this.ended ? 'distribution' : 'members';
      this.loadTab();
    }
  }

  get programId(): string {
    return getProgramId(this.program);
  }

  get isTeam(): boolean {
    return this.viewerRole === 'admin' || this.viewerRole === 'volunteer';
  }

  get isAdmin(): boolean {
    return this.viewerRole === 'admin';
  }

  get ended(): boolean {
    return isProgramExpired(this.program);
  }

  get isMealProgram(): boolean {
    const type = getProgramType(this.program);
    return type === 'sehri' || type === 'iftar';
  }

  setTab(tab: ConsoleTab): void {
    if (this.tab === tab) {
      return;
    }
    this.tab = tab;
    this.editing = null;
    this.loadTab();
  }

  private loadTab(): void {
    if (!this.programId) {
      return;
    }
    if (this.tab === 'members') {
      this.loadMembers();
    } else if (this.tab === 'distribution') {
      this.loadPackets();
    }
    // Stats loads itself (app-program-stats).
  }

  /* ------------------------------------------------------------ members */

  loadMembers(): void {
    this.membersLoading = true;
    this.needsGender = false;
    this.ramadanApi.programMembers(this.programId, this.isTeam ? this.genderFilter : '').subscribe({
      next: (response) => {
        this.membersLoading = false;
        this.members = response?.list ?? [];
        this.counts = response?.counts ?? null;
        this.viewerRole = response?.viewer_role ?? this.viewerRole;
        this.imagePath = response?.imagePath ?? this.imagePath;
      },
      error: (error) => {
        this.membersLoading = false;
        this.members = [];
        if (error?.error?.code === 'gender_required') {
          this.needsGender = true;
          return;
        }
        this.notify.error(error?.error?.error || this.t('PROGRAM_CONSOLE.LOAD_ERROR'));
      }
    });
  }

  setGenderFilter(gender: GenderFilter): void {
    this.genderFilter = gender;
    this.loadMembers();
  }

  get visibleMembers(): any[] {
    const term = this.memberQuery.trim().toLowerCase();
    return this.members.filter((member) => {
      if (this.roleFilter === 'volunteers' && member.role !== 2) {
        return false;
      }
      if (this.roleFilter === 'subscribers' && !(member.role === 3 && member.status !== 'waitlisted')) {
        return false;
      }
      if (this.roleFilter === 'waitlist' && member.status !== 'waitlisted') {
        return false;
      }
      if (!term) {
        return true;
      }
      return `${member.firstname} ${member.lastname} ${member.phone ?? ''} ${member.occupation ?? ''}`.toLowerCase().includes(term);
    });
  }

  trackById = (_: number, item: { id: number }): number => item.id;

  roleKey(member: any): string {
    if (member.role === 1) {
      return 'PROGRAM_CONSOLE.ROLE.ADMIN';
    }
    if (member.role === 2) {
      return 'PROGRAM_CONSOLE.ROLE.VOLUNTEER';
    }
    return member.status === 'waitlisted' ? 'PROGRAM_CONSOLE.ROLE.WAITLISTED' : 'PROGRAM_CONSOLE.ROLE.SUBSCRIBER';
  }

  avatar(member: any): string {
    return member?.image && member.image !== 'no-image.jpg' ? `${this.imagePath}${member.image}` : '';
  }

  toggleMenu(member: any, event: Event): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === member.id ? null : member.id;
  }

  canEditMember(member: any): boolean {
    return this.isTeam && !this.ended && (member.role === 2 || member.role === 3);
  }

  canMakeVolunteer(member: any): boolean {
    return this.isTeam && !this.ended && member.role === 3;
  }

  canMakeSubscriber(member: any): boolean {
    return this.isAdmin && !this.ended && member.role === 2;
  }

  canRemove(member: any): boolean {
    return !this.ended && ((this.isTeam && member.role === 3) || (this.isAdmin && member.role === 2));
  }

  hasMemberActions(member: any): boolean {
    return this.canEditMember(member) || this.canMakeVolunteer(member) || this.canMakeSubscriber(member) || this.canRemove(member);
  }

  setRole(member: any, role: 0 | 2 | 3): void {
    this.openMenuId = null;
    const name = `${member.firstname} ${member.lastname}`.trim();
    if (role === 0 && !window.confirm(this.i18n.translateWithParams('PROGRAM_CONSOLE.REMOVE_CONFIRM', { name }))) {
      return;
    }
    this.ramadanApi.setProgramMemberRole(this.programId, member.id, role).subscribe({
      next: (response) => {
        this.notify.success(response?.message || this.t('PROGRAM_CONSOLE.SAVED'));
        this.loadMembers();
      },
      error: (error) => this.notify.error(error?.error?.error || this.t('PROGRAM_CONSOLE.SAVE_ERROR'))
    });
  }

  /* ---------------------------------------------------------- add member */

  toggleAdd(): void {
    this.addOpen = !this.addOpen;
    this.addQuery = '';
    this.addResults = [];
    this.newMember = { firstname: '', lastname: '', phone: '', gender: '' };
  }

  onAddQuery(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    const term = this.addQuery.trim();
    if (term.length < 3) {
      this.addResults = [];
      return;
    }
    this.searchTimer = setTimeout(() => {
      this.addSearching = true;
      this.ramadanApi.programMemberSearch(this.programId, term).subscribe({
        next: (response) => {
          this.addSearching = false;
          this.addResults = response?.list ?? [];
        },
        error: () => {
          this.addSearching = false;
          this.addResults = [];
        }
      });
    }, 300);
  }

  addExisting(person: any, role: 2 | 3): void {
    this.ramadanApi.setProgramMemberRole(this.programId, person.id, role).subscribe({
      next: (response) => {
        this.notify.success(response?.message || this.t('PROGRAM_CONSOLE.SAVED'));
        person.role = role;
        this.loadMembers();
      },
      error: (error) => this.notify.error(error?.error?.error || this.t('PROGRAM_CONSOLE.SAVE_ERROR'))
    });
  }

  addNew(): void {
    const member = {
      firstname: this.newMember.firstname.trim(),
      lastname: this.newMember.lastname.trim(),
      phone: this.newMember.phone.replace(/\D/g, ''),
      gender: this.newMember.gender
    };
    if (member.firstname.length < 2 || !/^[6-9]\d{9}$/.test(member.phone) || !member.gender) {
      this.notify.warning(this.t('PROGRAM_CONSOLE.NEW_MEMBER_INVALID'));
      return;
    }
    this.addingNew = true;
    this.ramadanApi.addProgramMember(this.programId, member).subscribe({
      next: (response) => {
        this.addingNew = false;
        this.notify.success(response?.message || this.t('PROGRAM_CONSOLE.SAVED'));
        this.newMember = { firstname: '', lastname: '', phone: '', gender: '' };
        this.loadMembers();
      },
      error: (error) => {
        this.addingNew = false;
        this.notify.error(error?.error?.error || this.t('PROGRAM_CONSOLE.SAVE_ERROR'));
      }
    });
  }

  /* -------------------------------------------------- edit member profile */

  openEdit(member: any): void {
    this.openMenuId = null;
    this.editing = member;
    this.editLoading = true;
    this.editHistory = [];
    this.editMasjidChanged = false;
    this.ramadanApi.programMemberProfile(this.programId, member.id).subscribe({
      next: (response) => {
        this.editLoading = false;
        this.fillEditForm(response?.profile ?? {});
        this.editHistory = response?.history ?? [];
      },
      error: (error) => {
        this.editLoading = false;
        this.editing = null;
        this.notify.error(error?.error?.error || this.t('PROGRAM_CONSOLE.LOAD_ERROR'));
      }
    });
  }

  closeEdit(): void {
    this.editing = null;
  }

  onEditMasjid(masjid: PickedMasjid | null): void {
    this.editForm['masjid_id'] = masjid?.id ?? null;
    this.editForm['masjid_name'] = masjid?.name ?? null;
    this.editMasjidChanged = true;
  }

  saveEdit(): void {
    if (!this.editing || this.editSaving) {
      return;
    }
    const f = this.editForm;
    const payload: Record<string, unknown> = {
      firstname: String(f['firstname'] ?? '').trim(),
      lastname: String(f['lastname'] ?? '').trim(),
      gender: f['gender'],
      pincode: String(f['pincode'] ?? '').trim(),
      address: String(f['address'] ?? '').trim(),
      landmark: String(f['landmark'] ?? '').trim(),
      employment_status: f['employment_status'] ?? '',
      occupation: String(f['occupation'] ?? '').trim(),
      company_name: String(f['company_name'] ?? '').trim(),
      designation: String(f['designation'] ?? '').trim(),
      notes: String(f['notes'] ?? '').trim()
    };
    if (this.editMasjidChanged && f['masjid_id']) {
      payload['masjid_id'] = f['masjid_id'];
    }
    this.editSaving = true;
    this.ramadanApi.saveProgramMemberProfile(this.programId, this.editing.id, payload).subscribe({
      next: (response) => {
        this.editSaving = false;
        this.notify.success(response?.message || this.t('PROGRAM_CONSOLE.SAVED'));
        this.fillEditForm(response?.profile ?? {});
        this.editHistory = response?.history ?? this.editHistory;
        this.editMasjidChanged = false;
        this.loadMembers();
      },
      error: (error) => {
        this.editSaving = false;
        this.notify.error(error?.error?.error || this.t('PROGRAM_CONSOLE.SAVE_ERROR'));
      }
    });
  }

  private fillEditForm(profile: any): void {
    this.editForm = {
      ...profile,
      gender: profile?.gender ?? '',
      employment_status: profile?.employment_status ?? '',
      pincode: profile?.pincode ?? '',
      address: profile?.address ?? '',
      landmark: profile?.landmark ?? '',
      occupation: profile?.occupation ?? '',
      company_name: profile?.company_name ?? '',
      designation: profile?.designation ?? '',
      notes: profile?.notes ?? ''
    };
  }

  historyFieldKey(field: string): string {
    return 'PROGRAM_CONSOLE.FIELD.' + String(field).toUpperCase();
  }

  /* -------------------------------------------------------- distribution */

  loadPackets(): void {
    this.packetsLoading = true;
    this.ramadanApi.programPackets(this.programId, this.packetDate, this.packetGender).subscribe({
      next: (response) => {
        this.packetsLoading = false;
        this.imagePath = response?.imagePath ?? this.imagePath;
        this.packetEditable = !!response?.editable;
        this.packetTotals = response?.totals ?? this.packetTotals;
        this.packetRows = response?.list ?? [];
      },
      error: (error) => {
        this.packetsLoading = false;
        this.packetRows = [];
        this.notify.error(error?.error?.error || this.t('PROGRAM_CONSOLE.LOAD_ERROR'));
      }
    });
  }

  changePacketDate(value: string): void {
    this.packetDate = value || this.today();
    this.loadPackets();
  }

  setPacketGender(gender: GenderFilter): void {
    this.packetGender = gender;
    this.loadPackets();
  }

  get visiblePacketRows(): PacketRow[] {
    const term = this.packetQuery.trim().toLowerCase();
    return term
      ? this.packetRows.filter((row) => `${row.firstname} ${row.lastname} ${row.phone} ${row.token ?? ''}`.toLowerCase().includes(term))
      : this.packetRows;
  }

  /** Opens the packets dialog for one member. */
  openPacket(row: PacketRow): void {
    this.packetEditing = row;
    this.packetDraft = { packets: row.packets ?? 1, token: row.token != null ? String(row.token) : '' };
  }

  stepDraft(delta: number): void {
    this.packetDraft.packets = Math.min(999, Math.max(0, (Number(this.packetDraft.packets) || 0) + delta));
  }

  savePacket(): void {
    const row = this.packetEditing;
    const packets = Number(this.packetDraft.packets);
    const token = String(this.packetDraft.token ?? '').trim();
    if (!row || this.packetsSaving) {
      return;
    }
    if (!Number.isInteger(packets) || packets < 0 || packets > 999 || (token !== '' && !/^\d{1,6}$/.test(token))) {
      this.notify.warning(this.t('PROGRAM_CONSOLE.PACKET_INVALID'));
      return;
    }
    this.packetsSaving = true;
    this.ramadanApi.savePackets(this.programId, this.packetDate, [{ id_customer: row.id, packets, token: token === '' ? null : Number(token) }]).subscribe({
      next: (response) => {
        this.packetsSaving = false;
        this.packetEditing = null;
        this.notify.success(this.i18n.translateWithParams('PROGRAM_CONSOLE.PACKET_SAVED', {
          packets, name: `${row.firstname} ${row.lastname}`.trim()
        }));
        this.packetTotals = { ...this.packetTotals, ...(response?.totals ?? {}) };
        this.loadPackets();
      },
      error: (error) => {
        this.packetsSaving = false;
        this.notify.error(error?.error?.error || this.t('PROGRAM_CONSOLE.SAVE_ERROR'));
      }
    });
  }

  /* -------------------------------------------------------------- helpers */

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenuId = null;
  }

  private today(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  private t(key: string): string {
    return this.i18n.translateWithParams(key, {});
  }
}
