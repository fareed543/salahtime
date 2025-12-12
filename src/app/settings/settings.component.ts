import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SettingsData } from './salah-methods.config';
import { DEFAULT_SALAH_SETTINGS, SettingsService } from './settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  calculationMethods = SettingsData;
  salahSettingsForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm() {
    const current = this.settingsService.getCurrentSettings();

    this.salahSettingsForm = this.fb.group({
      calculationMethod: [current.calculationMethod],
      showNafilSalah: [current.showNafilSalah],
      showMakruhTime: [current.showMakruhTime],
      madhab: [current.madhab],
      locationMode: [current.locationMode],
      enableNotifications: [current.enableNotifications],
      showHijri: [current.showHijri],
      hijriOffset: [current.hijriOffset]
    });

    // LIVE UPDATE SETTINGS WHEN FORM CHANGES
    this.salahSettingsForm.valueChanges.subscribe(value => {
      this.settingsService.updateSettings(value);
    });
  }

  onSubmit() {
    console.log("Settings updated:", this.salahSettingsForm.value);
  }

  onReset() {
    this.salahSettingsForm.reset(DEFAULT_SALAH_SETTINGS);
    this.settingsService.updateSettings(DEFAULT_SALAH_SETTINGS);
  }
}
