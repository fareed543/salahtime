import { prayerScreenGuard } from 'src/app/services/device-info.service';
import { inject, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes, Route, UrlSegment } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { SettingsDialogModule } from 'src/app/shared/dialogs/settings-dialog/settings-dialog.module';
import { SalahtimeComponent } from './salahtime.component';
import { SalahtimeCurrentTimeComponent } from './current-time/current-time.component';
import { CountryCitiesComponent, locationSlug } from './country-cities.component';
import { LocationService } from 'src/app/services/location.service';
import { map } from 'rxjs';

const routes: Routes = [
  {
    path: '',
    canActivate: [prayerScreenGuard],
    data: { prayerScreen: true },
    component: SalahtimeComponent
  },
  {
    path: ':country/:city',
    canActivate: [prayerScreenGuard],
    data: { prayerScreen: true },
    component: SalahtimeComponent
  },
  {
    path: ':country',
    component: CountryCitiesComponent,
    canMatch: [(_route: Route, segments: UrlSegment[]) => inject(LocationService).getOfflineLocationsList().pipe(
      map(locations => locations.some(city => locationSlug(city.country ?? '') === segments[0]?.path))
    )]
  },
  {
    path: ':city',
    canActivate: [prayerScreenGuard],
    data: { prayerScreen: true },
    component: SalahtimeComponent
  }
];

@NgModule({
  declarations: [
    SalahtimeComponent,
    CountryCitiesComponent,
    SalahtimeCurrentTimeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    SharedModule,
    SettingsDialogModule
  ]
})
export class SalahtimeModule { }
