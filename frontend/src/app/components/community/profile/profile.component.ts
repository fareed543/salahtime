import { Component, OnInit } from '@angular/core';
import { AuthApiService } from 'src/app/services/auth-api.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ScreenHeaderAction } from 'src/app/shared/screen-header/screen-header.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  loading = false;
  saving = false;
  message = '';
  imagePath = '';
  form = {
    firstname: '',
    lastname: '',
    phone: '',
    gender: '',
    pincode: '',
    address: '',
    landmark: '',
    masjid: '',
    company_name: '',
    college_name: '',
    occupation: '',
    designation: '',
    notes: '',
    accountDeactivation: 1,
    enableOfflineAccess: 0,
    emailNotification: 1
  };

  headerActions: ScreenHeaderAction[] = [
    { id: 'save', icon: 'bi-check2', ariaLabel: 'Save profile' }
  ];

  constructor(
    private authApiService: AuthApiService,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  onHeaderAction(action: ScreenHeaderAction): void {
    if (action.id === 'save') {
      this.saveProfile();
    }
  }

  loadProfile(): void {
    this.loading = true;
    this.message = '';

    this.authApiService.getProfile().subscribe({
      next: (response) => {
        this.loading = false;
        this.imagePath = response?.imagePath ?? '';
        this.patchForm(response?.userData ?? this.localStorageService.getItem<any>('userInfo') ?? {});
      },
      error: () => {
        this.loading = false;
        this.message = 'Unable to load profile right now.';
      }
    });
  }

  saveProfile(): void {
    if (this.saving) {
      return;
    }

    this.saving = true;
    this.message = '';
    this.authApiService.saveProfile(this.form).subscribe({
      next: (response) => {
        this.saving = false;
        this.message = 'Profile updated successfully.';
        this.imagePath = response?.imagePath ?? this.imagePath;
        this.patchForm(response);
      },
      error: () => {
        this.saving = false;
        this.message = 'Unable to update profile right now.';
      }
    });
  }

  private patchForm(user: any): void {
    this.form = {
      firstname: user?.firstname ?? '',
      lastname: user?.lastname ?? '',
      phone: user?.phone ?? '',
      gender: user?.gender ?? '',
      pincode: user?.pincode ?? '',
      address: user?.address ?? '',
      landmark: user?.landmark ?? '',
      masjid: user?.masjid ?? '',
      company_name: user?.company_name ?? '',
      college_name: user?.college_name ?? '',
      occupation: user?.occupation ?? '',
      designation: user?.designation ?? '',
      notes: user?.notes ?? '',
      accountDeactivation: Number(user?.status ?? user?.active ?? 1),
      enableOfflineAccess: Number(user?.offline_access ?? 0),
      emailNotification: Number(user?.email_notification ?? 1)
    };
  }
}
