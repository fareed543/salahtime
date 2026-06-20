import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthShellComponent } from './components/auth/auth-shell/auth-shell.component';
import { LoginComponent } from './components/auth/login/login.component';
import { SignupComponent } from './components/auth/signup/signup.component';
import { ForgotPasswordComponent } from './components/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/auth/reset-password/reset-password.component';
import { VerifyPasswordOtpComponent } from './components/auth/verify-password-otp/verify-password-otp.component';
import { AuthGuard } from './services/auth.guard';
import { ProgramsComponent } from './components/community/programs/programs.component';
import { SubscriptionComponent } from './components/community/subscription/subscription.component';
import { MasjidComponent } from './components/community/masjid/masjid.component';
import { HalqaComponent } from './components/community/halqa/halqa.component';
import { ZakatCalculatorComponent } from './components/community/zakat-calculator/zakat-calculator.component';
import { UserDetailsComponent } from './components/community/user-details/user-details.component';
import { QiblaDirectionComponent } from './components/qibla-direction/qibla-direction.component';
import { CalenderComponent } from './shared/calender/calender.component';
import { ProfileComponent } from './components/community/profile/profile.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'salahtime',
        loadChildren: () => import('./components/salahtime/salahtime.module').then(m => m.SalahtimeModule)
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./components/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'about',
        loadChildren: () => import('./components/about/about.module').then(m => m.AboutModule)
      },
      {
        path: 'privacy-policy',
        loadChildren: () => import('./components/privacy-policy/privacy-policy.module').then(m => m.PrivacyPolicyModule)
      },
      {
        path: 'settings',
        loadChildren: () => import('./components/settings/settings.module').then(m => m.SettingsModule)
      },
      {
        path: 'ramzan',
        loadChildren: () => import('./components/ramzan/ramzan.module').then(m => m.RamzanModule)
      },
      {
        path: 'tasbih',
        loadChildren: () => import('./components/tasbih/tasbih.module').then(m => m.TasbihModule)
      },
      {
        path: 'duas',
        loadChildren: () => import('./components/duas/duas.module').then(m => m.DuasModule)
      },
      {
        path: 'programs',
        component: ProgramsComponent
      },
      {
        path: 'programs/:id',
        component: ProgramsComponent
      },
      {
        path: 'subscription',
        component: SubscriptionComponent
      },
      {
        path: 'subscription/:programId',
        component: SubscriptionComponent
      },
      {
        path: 'masjid',
        component: MasjidComponent
      },
      {
        path: 'masjid/:id',
        component: MasjidComponent
      },
      {
        path: 'halqa',
        component: HalqaComponent
      },
      {
        path: 'area',
        component: HalqaComponent
      },
      {
        path: 'halqa/:id',
        component: HalqaComponent
      },
      {
        path: 'area/:id',
        component: HalqaComponent
      },
      {
        path: 'qibla-direction',
        component: QiblaDirectionComponent
      },
      {
        path: 'salah-calendar',
        component: CalenderComponent
      },
      {
        path: 'zakat-calculator',
        component: ZakatCalculatorComponent
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
    ]
  },
  {
    path: 'login',
    component: AuthShellComponent,
    children: [
      {
        path: '',
        component: LoginComponent
      }
    ]
  },
  {
    path: 'register',
    component: AuthShellComponent,
    children: [
      {
        path: '',
        component: SignupComponent
      }
    ]
  },
  {
    path: 'forgot-password',
    component: AuthShellComponent,
    children: [
      {
        path: '',
        component: ForgotPasswordComponent
      }
    ]
  },
  {
    path: 'verify-password-otp',
    component: AuthShellComponent,
    children: [
      {
        path: '',
        component: VerifyPasswordOtpComponent
      }
    ]
  },
  {
    path: 'reset-password',
    component: AuthShellComponent,
    children: [
      {
        path: '',
        component: ResetPasswordComponent
      }
    ]
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'top',
      anchorScrolling: 'enabled'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
