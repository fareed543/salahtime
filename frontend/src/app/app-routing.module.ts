import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        // NF-020: the website's home page; the Android app falls through to the Dashboard below.
        path: '',
        canMatch: [() => !Capacitor.isNativePlatform()],
        loadChildren: () => import('./components/web-home/web-home.module').then(m => m.WebHomeModule),
        data: {
          seo: {
            title: 'Salah Times Today: Namaz Timing & Prayer Times | SalahTime',
            description: 'SalahTime shows current namaz timing, namaz time, daily Islamic prayer times, Fajr, Dhuhr, Asr, Maghrib, Isha, Qibla direction, Islamic calendar, duas and tasbih tools.',
            canonicalPath: '/'
          }
        }
      },
      {
        path: '',
        loadChildren: () => import('./components/dashboard/dashboard.module').then(m => m.DashboardModule),
        data: {
          seo: {
            title: 'Salah Times Today: Namaz Timing & Prayer Times | SalahTime',
            description: 'SalahTime shows current namaz timing, namaz time, daily Islamic prayer times, Fajr, Dhuhr, Asr, Maghrib, Isha, Qibla direction, Islamic calendar, duas and tasbih tools.',
            canonicalPath: '/'
          }
        }
      },
      {
        path: 'dashboard',
        redirectTo: '',
        pathMatch: 'full'
      },
      {
        path: 'prayer-times',
        loadChildren: () => import('./components/salahtime/salahtime.module').then(m => m.SalahtimeModule),
        data: {
          seo: {
            title: 'Prayer Times Today, Namaz Timing & Azan Time in India | SalahTime',
            description: 'Find prayer times today, namaz timing and azan time across Indian cities including Fajr, Dhuhr, Asr, Maghrib, Isha, Ishraq, Chasht and Zawal.',
            canonicalPath: '/prayer-times'
          }
        }
      },
      {
        // The mobile layout used to live here; it now shows at the /prayer-times URLs.
        path: 'all-prayer-times',
        redirectTo: 'prayer-times',
        pathMatch: 'full'
      },
      {
        path: 'all-prayer-times/:country/:city',
        redirectTo: 'prayer-times/:country/:city'
      },
      {
        path: 'all-prayer-times/:city',
        redirectTo: 'prayer-times/:city'
      },
      {
        path: 'salahtime',
        redirectTo: 'prayer-times',
        pathMatch: 'full'
      },
      {
        path: 'salahtime/:city',
        redirectTo: 'prayer-times/:city'
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
        // Support Desk: users report issues; the form has no search value, so keep it out of the index.
        path: 'report-issue',
        loadChildren: () => import('./components/report-issue/report-issue.module').then(m => m.ReportIssueModule),
        data: {
          seo: {
            title: 'Report an Issue | SalahTime',
            description: 'Tell the SalahTime team about a wrong prayer time, a notification problem or anything else that is not working.',
            canonicalPath: '/report-issue',
            robots: 'noindex, follow'
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
            canonicalPath: '/settings',
            robots: 'noindex, follow'
          }
        }
      },
      {
        path: 'sehri-iftar',
        loadChildren: () => import('./components/ramzan/ramzan.module').then(m => m.RamzanModule),
        data: {
          seo: {
            title: 'Ramadan 2027 Dates, Sehri and Iftar Time | SalahTime',
            description: 'Ramadan 2027 dates and the full Sehri and Iftar timetable for your city: what time Sehri ends and Iftar begins every day of Ramadan.',
            canonicalPath: '/sehri-iftar'
          }
        }
      },
      {
        path: 'zikar',
        loadChildren: () => import('./components/tasbih/tasbih.module').then(m => m.TasbihModule),
        data: {
          seo: {
            title: 'Digital Tasbih Counter | SalahTime',
            description: 'Use the SalahTime digital tasbih counter alongside namaz timing, duas, Qibla direction and Islamic daily tools.',
            canonicalPath: '/zikar'
          }
        }
      },
      {
        path: 'tasbih',
        redirectTo: 'zikar',
        pathMatch: 'full'
      },
      {
        // NF-015 Sunnah Shorts. Title and description: SHORTS_META in seo/seo-content.ts.
        path: 'shorts',
        loadChildren: () => import('./components/shorts/shorts.module').then(m => m.ShortsModule),
        data: {
          seo: {
            title: 'Sunnah Shorts: Daily Sunnahs of the Prophet ﷺ | SalahTime',
            description: 'One Sunnah of the Prophet ﷺ at a time: short cards for salah, eating, sleeping and daily life, each with its hadith reference. Like, save and share.',
            canonicalPath: '/shorts'
          }
        }
      },
      // The old Learn lessons were replaced by Sunnah Shorts (NF-015); the server also 301s these.
      { path: 'learn', redirectTo: 'shorts', pathMatch: 'full' },
      { path: 'learn/:any', redirectTo: 'shorts', pathMatch: 'full' },
      { path: 'learn/:any/:step', redirectTo: 'shorts', pathMatch: 'full' },
      {
        // NF-003: community articles. Article and author pages set their own SEO once loaded.
        path: 'blog',
        loadChildren: () => import('./components/blog/blog.module').then(m => m.BlogModule),
        data: {
          seo: {
            title: 'Islamic Articles on Salah, Quran and Ramadan | SalahTime',
            description: 'Read articles by the SalahTime community on salah, Quran, duas, Ramadan and masjid life, each reviewed by our editors before it is published.',
            canonicalPath: '/blog'
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
        loadChildren: () => import('./shared/calender/salah-calendar.module').then(m => m.SalahCalendarModule),
        data: {
          seo: {
            title: 'Salah Calendar and Islamic Prayer Times | SalahTime',
            description: 'Open the SalahTime salah calendar for daily Islamic prayer times, current namaz timing, Ramadan dates, Sehri and Iftar times.',
            canonicalPath: '/salah-calendar'
          }
        }
      },
      {
        // CR-006: website-only pages per prayer (/asr-time, /asr-time/india/indore, ...).
        path: '',
        loadChildren: () => import('./components/prayer-focus/prayer-focus.module').then(m => m.PrayerFocusModule)
      },
      {
        path: '',
        loadChildren: () => import('./components/community/community.module').then(m => m.CommunityModule)
      }
    ]
  },
  {
    // Outside MainLayoutComponent on purpose: the masjid's monitor screen has no app chrome.
    // Public (no AuthGuard): it only shows the masjid's public name, address and timings.
    path: 'masjid-display/:id',
    loadChildren: () => import('./components/masjid-display/masjid-display.module').then(m => m.MasjidDisplayModule),
    data: {
      seo: {
        title: 'Masjid Prayer Times Display | SalahTime',
        description: 'Full-screen azan and jamat timings for masjid display screens.',
        canonicalPath: '/masjid-display',
        robots: 'noindex, follow'
      }
    }
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
