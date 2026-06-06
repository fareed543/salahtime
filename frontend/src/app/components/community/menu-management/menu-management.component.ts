import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuConfigItem } from 'src/app/models/menu-config.model';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { MenuConfigService } from 'src/app/services/menu-config.service';

@Component({
  selector: 'app-menu-management',
  templateUrl: './menu-management.component.html',
  styleUrls: ['./menu-management.component.scss']
})
export class MenuManagementComponent implements OnInit {
  modules: MenuConfigItem[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  isSuperAdmin = false;

  constructor(
    private menuConfigService: MenuConfigService,
    private localStorageService: LocalStorageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userInfo = this.localStorageService.getItem<{ customerTypeId?: number; id_customer_type?: number }>('userInfo');
    const customerTypeId = Number(userInfo?.customerTypeId ?? userInfo?.id_customer_type ?? 0);
    this.isSuperAdmin = customerTypeId === 1;

    if (!this.isSuperAdmin) {
      void this.router.navigate(['/dashboard']);
      return;
    }

    this.loadModules();
  }

  toggleModule(module: MenuConfigItem): void {
    module.enabled = !module.enabled;
    this.successMessage = '';
  }

  save(): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.menuConfigService.saveManagedModules(this.modules).subscribe({
      next: (response) => {
        this.modules = [...(response.modules ?? [])].sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));
        this.successMessage = 'Menu settings saved successfully.';
        this.saving = false;
      },
      error: () => {
        this.errorMessage = 'Unable to save menu settings right now.';
        this.saving = false;
      }
    });
  }

  private loadModules(): void {
    this.loading = true;
    this.errorMessage = '';

    this.menuConfigService.getManagedModules().subscribe({
      next: (modules) => {
        this.modules = [...modules].sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load menu settings right now.';
        this.loading = false;
      }
    });
  }
}
