import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { ProgramsComponent } from './programs/programs.component';
import { SubscriptionComponent } from './subscription/subscription.component';
import { MasjidComponent } from './masjid/masjid.component';
import { MasjidGalleryComponent } from './masjid/masjid-gallery/masjid-gallery.component';
import { MasjidTimingHistoryComponent } from './masjid/masjid-timing-history/masjid-timing-history.component';
import { HalqaComponent } from './halqa/halqa.component';
import { ZakatCalculatorComponent } from './zakat-calculator/zakat-calculator.component';
import { UserDetailsComponent } from './user-details/user-details.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { TimePickerDialogComponent } from 'src/app/shared/time-picker-dialog/time-picker-dialog.component';
import { ProfileComponent } from './profile/profile.component';
import { ProgramConsoleComponent } from './programs/program-console/program-console.component';
import { ProgramStatsComponent } from './programs/program-stats/program-stats.component';
import { GenderConfirmComponent } from 'src/app/shared/gender-confirm/gender-confirm.component';
import { MasjidPickerComponent } from 'src/app/shared/masjid-picker/masjid-picker.component';
import { MasjidMembersComponent } from './masjid/masjid-members/masjid-members.component';
import { AreaPickerComponent } from './programs/area-picker/area-picker.component';
import { SheetDialogComponent } from 'src/app/shared/sheet-dialog/sheet-dialog.component';
import { NotificationsListComponent } from './notifications-list/notifications-list.component';
import { AuthGuard } from 'src/app/services/auth.guard';

const routes: Routes = [
  {
    path: 'programs',
    component: ProgramsComponent,
    canActivate: [AuthGuard]
  },
  // NF-013: announcements from the back office (opened by tapping a push notification).
  {
    path: 'notifications',
    component: NotificationsListComponent
  },
  {
    path: 'programs/:id',
    component: ProgramsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'subscription',
    component: SubscriptionComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'subscription/:programId',
    component: SubscriptionComponent,
    canActivate: [AuthGuard]
  },
  // Masjid pages are public; adding, editing and favourites still ask the user to log in.
  {
    path: 'masjid',
    component: MasjidComponent,
    data: {
      seo: {
        title: 'Masjids Near You: Jamat & Azan Timings | SalahTime',
        description: 'Find masjids with their daily jamat and azan timings for Fajr, Dhuhr, Asr, Maghrib, Isha and Juma, plus address, madhab, facilities and photos.',
        canonicalPath: '/masjid'
      }
    }
  },
  {
    path: 'masjid/new',
    component: MasjidComponent,
    canActivate: [AuthGuard]
  },
  // Old numeric links; the page replaces the URL with /masjid/<city>/<name> once loaded.
  {
    path: 'masjid/:id',
    component: MasjidComponent
  },
  {
    path: 'masjid/:city/:slug',
    component: MasjidComponent
  },
  {
    path: 'halqa',
    component: HalqaComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'area',
    component: HalqaComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'halqa/:id',
    component: HalqaComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'area/:id',
    component: HalqaComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'zakat-calculator',
    component: ZakatCalculatorComponent,
    data: {
      seo: {
        title: 'Zakat Calculator | SalahTime Islamic Tools',
        description: 'Calculate zakat and use SalahTime for prayer times, namaz timing, Qibla direction, duas, tasbih and Islamic calendar tools.',
        canonicalPath: '/zakat-calculator'
      }
    }
  },
  {
    path: 'users/:id',
    component: UserDetailsComponent
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  declarations: [
    ProgramConsoleComponent,
    ProgramStatsComponent,
    ProgramsComponent,
    SubscriptionComponent,
    MasjidComponent,
    MasjidGalleryComponent,
    MasjidTimingHistoryComponent,
    HalqaComponent,
    ZakatCalculatorComponent,
    UserDetailsComponent,
    ProfileComponent
  ],
  imports: [
    GenderConfirmComponent,
    MasjidPickerComponent,
    MasjidMembersComponent,
    AreaPickerComponent,
    SheetDialogComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TranslateModule,
    SharedModule,
    // Only the masjid editor uses it, so it is not in SharedModule (loaded up front by AppModule).
    TimePickerDialogComponent
  ]
})
export class CommunityModule {}
