import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { ProgramsComponent } from './programs/programs.component';
import { SubscriptionComponent } from './subscription/subscription.component';
import { MasjidComponent } from './masjid/masjid.component';
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
  {
    path: 'masjid',
    component: MasjidComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'masjid/:id',
    component: MasjidComponent,
    canActivate: [AuthGuard]
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
