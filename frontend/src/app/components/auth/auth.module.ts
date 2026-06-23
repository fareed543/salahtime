import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthShellComponent } from './auth-shell/auth-shell.component';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { VerifyPasswordOtpComponent } from './verify-password-otp/verify-password-otp.component';

const routes: Routes = [
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
  }
];

@NgModule({
  declarations: [
    AuthShellComponent,
    LoginComponent,
    SignupComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    VerifyPasswordOtpComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild()
  ]
})
export class AuthModule {}
