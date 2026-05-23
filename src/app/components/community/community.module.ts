import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProgramsComponent } from './programs/programs.component';
import { SubscriptionComponent } from './subscription/subscription.component';
import { MasjidComponent } from './masjid/masjid.component';
import { HalqaComponent } from './halqa/halqa.component';
import { ZakatCalculatorComponent } from './zakat-calculator/zakat-calculator.component';
import { UserDetailsComponent } from './user-details/user-details.component';

@NgModule({
  declarations: [
    ProgramsComponent,
    SubscriptionComponent,
    MasjidComponent,
    HalqaComponent,
    ZakatCalculatorComponent,
    UserDetailsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export class CommunityModule {}
