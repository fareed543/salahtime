import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthShellComponent } from './components/auth/auth-shell/auth-shell.component';
import { LoginComponent } from './components/auth/login/login.component';
import { SignupComponent } from './components/auth/signup/signup.component';
import { ForgotPasswordComponent } from './components/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/auth/reset-password/reset-password.component';
import { AuthGuard } from './services/auth.guard';
import { ProgramsComponent } from './components/community/programs/programs.component';
import { SubscriptionComponent } from './components/community/subscription/subscription.component';
import { MasjidComponent } from './components/community/masjid/masjid.component';
import { HalqaComponent } from './components/community/halqa/halqa.component';
import { ZakatCalculatorComponent } from './components/community/zakat-calculator/zakat-calculator.component';
import { UserDetailsComponent } from './components/community/user-details/user-details.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
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
        path: 'programs',
        component: ProgramsComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'subscription',
        component: SubscriptionComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'masjid',
        component: MasjidComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'halqa',
        component: HalqaComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'zakat-calculator',
        component: ZakatCalculatorComponent
      },
      {
        path: 'users/:id',
        component: UserDetailsComponent,
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
