import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SettingsData } from './calculation-methods';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {

  calculationMethods = SettingsData;   // ✅ FIXED: Direct array assign
  salahSettingsForm!: FormGroup;

  constructor(private fb: FormBuilder) {

    this.salahSettingsForm = this.fb.group({

      // Calculation
      calculationMethod: ['mwl'],
      asrMethod: ['standard'],
      highLatitude: ['middle'],

      // Hijri
      showHijri: [true],
      hijriOffset: [0],

    });
  }

  onSubmit() {
    console.log('Saved Settings:', this.salahSettingsForm.value);
  }

  onReset() {
    this.salahSettingsForm.reset();
  }
}
