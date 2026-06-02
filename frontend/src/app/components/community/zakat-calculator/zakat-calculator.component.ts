import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ZakatApiService } from 'src/app/services/zakat-api.service';

@Component({
  selector: 'app-zakat-calculator',
  templateUrl: './zakat-calculator.component.html',
  styleUrls: ['./zakat-calculator.component.scss']
})
export class ZakatCalculatorComponent implements OnInit {
  cities: any[] = [];
  categories: any[] = [];
  prices: any = null;
  zakatDue: number | null = null;

  readonly form = this.fb.group({
    city: ['', Validators.required],
    savings: [0, Validators.required],
    gold: [0],
    silver: [0],
    liabilities: [0]
  });

  constructor(
    private fb: FormBuilder,
    private zakatService: ZakatApiService
  ) {}

  ngOnInit(): void {
    this.zakatService.getCities().subscribe({
      next: (response) => {
        this.cities = Array.isArray(response) ? response : response?.list ?? [];
      }
    });

    this.zakatService.getCategories().subscribe({
      next: (response) => {
        this.categories = Array.isArray(response) ? response : response?.list ?? [];
      }
    });
  }

  loadPrices(): void {
    const city = this.form.get('city')?.value;
    if (!city) {
      return;
    }

    this.zakatService.getLocationPrices(String(city)).subscribe({
      next: (response) => {
        this.prices = response;
      }
    });
  }

  calculate(): void {
    const values = this.form.getRawValue();
    const totalAssets =
      Number(values.savings || 0) + Number(values.gold || 0) + Number(values.silver || 0);
    const liabilities = Number(values.liabilities || 0);
    const netAmount = Math.max(totalAssets - liabilities, 0);
    this.zakatDue = Number((netAmount * 0.025).toFixed(2));
  }
}
