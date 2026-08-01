import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BackofficeAccessGuard } from './guards/backoffice-access.guard';
import { BackofficeAuthGuard } from './guards/backoffice-auth.guard';
import { AuthLayoutComponent } from './shared/auth-layout/auth-layout.component';
import { LayoutComponent } from './shared/layout/layout.component';


export const routes: Routes = [
  { path : '', redirectTo : 'login', pathMatch:'full' },

 
  {
    path : '',
    component : AuthLayoutComponent,
    canActivateChild: [BackofficeAuthGuard],
    children : [
      {
          path: 'login',
          loadChildren: () =>import('./auth/login/login.module').then(m => m.LoginModule)
        },
        {
          path: 'forgot-password',
          loadChildren: () =>import('./auth/forgot-password/forgot-password.module').then(m => m.ForgotPasswordModule)
        },
        {
          path: 'reset-password',
          loadChildren: () =>import('./auth/reset-password/reset-password.module').then(m => m.ResetPasswordModule)
        },
    ]
  },

  {
    path : '',
    component : LayoutComponent,
    canActivateChild: [BackofficeAccessGuard],
    children : [
      {
        path: 'dashboard',
        data: { allowedRoles: ['administrator', 'manager', 'support', 'developer', 'users', 'restricted-user'] },
        loadChildren: () =>
          import('./dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'users',
        data: { allowedRoles: ['administrator', 'manager'] },
        loadChildren: () =>
          import('./users/users.module').then(m => m.UsersModule)
      },
      {
        path: 'roles',
        data: { allowedRoles: ['administrator'] },
        loadChildren: () =>
          import('./roles/roles.module').then(m => m.RolesModule)
      },
      {
        path: 'permissions',
        data: { allowedRoles: ['administrator'] },
        loadChildren: () =>
          import('./permissions/permissions.module').then(m => m.PermissionsModule)
      },
      {
        path: 'calendar',
        data: { allowedRoles: ['administrator', 'manager'] },
        loadChildren: () =>
          import('./calendar/calendar.module').then(m => m.CalendarModule)
      },
      {
        path: 'app-versions',
        data: { allowedRoles: ['administrator', 'developer'] },
        loadChildren: () =>
          import('./app-versions/app-versions.module').then(m => m.AppVersionsModule)
      },
      {
        path: 'notifications',
        data: { allowedRoles: ['administrator', 'manager'] },
        loadChildren: () =>
          import('./notifications/notifications.module').then(m => m.NotificationsModule)
      },
      {
        path: 'emails',
        data: { allowedRoles: ['administrator', 'manager'] },
        loadChildren: () =>
          import('./emails/emails.module').then(m => m.EmailsModule)
      },
      {
        path: 'email-templates',
        data: { allowedRoles: ['administrator', 'manager'] },
        loadChildren: () =>
          import('./email-templates/email-templates.module').then(m => m.EmailTemplatesModule)
      },
      {
        path: 'developer',
        data: { allowedRoles: ['administrator', 'developer'] },
        loadChildren: () =>
          import('./developer/developer.module').then(m => m.DeveloperModule)
      }
    ]
  },
  
  { path: '**', redirectTo: 'login' }

];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
