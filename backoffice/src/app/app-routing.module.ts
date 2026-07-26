import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthLayoutComponent } from './shared/auth-layout/auth-layout.component';
import { LayoutComponent } from './shared/layout/layout.component';


export const routes: Routes = [
  { path : '', redirectTo : 'login', pathMatch:'full' },

 
  {
    path : '',
    component : AuthLayoutComponent,
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
    children : [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'users',
        loadChildren: () =>
          import('./users/users.module').then(m => m.UsersModule)
      },
      {
        path: 'calendar',
        loadChildren: () =>
          import('./calendar/calendar.module').then(m => m.CalendarModule)
      },
      {
        path: 'app-versions',
        loadChildren: () =>
          import('./app-versions/app-versions.module').then(m => m.AppVersionsModule)
      },
      {
        path: 'developer',
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
