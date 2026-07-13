import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { CalenderComponent } from './shared/calender/calender.component';

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
        loadChildren: () => import('./components/salahtime/salahtime.module').then(m => m.SalahtimeModule),
        data: {
          seo: {
            title: 'Prayer Times Today by City | SalahTime Namaz Timing',
            description: 'Find accurate prayer times today, current namaz timing, namaz time, azan time, Islamic prayer times, Qibla direction and salah calendar by supported city.',
            canonicalPath: '/salahtime'
          }
        }
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./components/dashboard/dashboard.module').then(m => m.DashboardModule),
        data: {
          seo: {
            title: 'SalahTime - Current Namaz Timing, Namaz Time and Prayer Times',
            description: 'SalahTime shows current namaz timing, namaz time, daily Islamic prayer times, Fajr, Dhuhr, Asr, Maghrib, Isha, Qibla direction, Islamic calendar, duas and tasbih tools.',
            canonicalPath: '/'
          }
        }
      },
      {
        path: 'about',
        loadChildren: () => import('./components/about/about.module').then(m => m.AboutModule),
        data: {
          seo: {
            title: 'About SalahTime Prayer Times and Islamic Tools',
            description: 'Learn how SalahTime calculates Islamic prayer times, namaz timing, Qibla direction and daily salah tools for Muslim worship routines.',
            canonicalPath: '/about'
          }
        }
      },
      {
        path: 'privacy-policy',
        loadChildren: () => import('./components/privacy-policy/privacy-policy.module').then(m => m.PrivacyPolicyModule),
        data: {
          seo: {
            title: 'Privacy Policy | SalahTime',
            description: 'Read the SalahTime privacy policy for prayer times, location settings, reminders and Islamic worship tools.',
            canonicalPath: '/privacy-policy'
          }
        }
      },
      {
        path: 'settings',
        loadChildren: () => import('./components/settings/settings.module').then(m => m.SettingsModule),
        data: {
          seo: {
            title: 'Prayer Time Settings | SalahTime',
            description: 'Adjust salah calculation method, madhab, location, azan reminders and namaz timing preferences in SalahTime.',
            canonicalPath: '/settings'
          }
        }
      },
      {
        path: 'sehri-iftar',
        loadChildren: () => import('./components/ramzan/ramzan.module').then(m => m.RamzanModule),
        data: {
          seo: {
            title: 'Ramadan 2026 Dates, Sehri and Iftar Time | SalahTime',
            description: 'View Ramadan 2026 dates, daily Sehri and Iftar timings, and what time is iftar today for your selected SalahTime location.',
            canonicalPath: '/sehri-iftar'
          }
        }
      },
      {
        path: 'tasbih',
        loadChildren: () => import('./components/tasbih/tasbih.module').then(m => m.TasbihModule),
        data: {
          seo: {
            title: 'Digital Tasbih Counter | SalahTime',
            description: 'Use the SalahTime digital tasbih counter alongside namaz timing, duas, Qibla direction and Islamic daily tools.',
            canonicalPath: '/tasbih'
          }
        }
      },
      {
        path: 'duas',
        loadChildren: () => import('./components/duas/duas.module').then(m => m.DuasModule),
        data: {
          seo: {
            title: 'Masnoon Duas and Daily Islamic Supplications | SalahTime',
            description: 'Browse Masnoon duas and daily Islamic supplications with SalahTime prayer times, salah calendar, Qibla direction and tasbih.',
            canonicalPath: '/duas'
          }
        }
      },
      {
        path: 'qibla-direction',
        loadChildren: () => import('./components/qibla-direction/qibla-direction.module').then(m => m.QiblaDirectionModule),
        data: {
          seo: {
            title: 'Qibla Direction Finder | SalahTime',
            description: 'Find Qibla direction for salah and use accurate prayer times, namaz timing, azan reminders and Islamic calendar tools.',
            canonicalPath: '/qibla-direction'
          }
        }
      },
      {
        path: 'salah-calendar',
        component: CalenderComponent,
        data: {
          seo: {
            title: 'Salah Calendar and Islamic Prayer Times | SalahTime',
            description: 'Open the SalahTime salah calendar for daily Islamic prayer times, current namaz timing, Ramadan dates, Sehri and Iftar times.',
            canonicalPath: '/salah-calendar'
          }
        }
      },
      {
        path: '',
        loadChildren: () => import('./components/community/community.module').then(m => m.CommunityModule)
      }
    ]
  },
  {
    path: '',
    loadChildren: () => import('./components/auth/auth.module').then(m => m.AuthModule)
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
