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
import { ProfileComponent } from './profile/profile.component';
import { AuthGuard } from 'src/app/services/auth.guard';

const routes: Routes = [
  {
    path: 'programs',
    component: ProgramsComponent,
    canActivate: [AuthGuard]
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
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TranslateModule,
    SharedModule
  ]
})
export class CommunityModule {}
