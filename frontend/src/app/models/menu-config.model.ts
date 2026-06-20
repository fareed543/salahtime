export interface MenuConfigItem {
  id?: number;
  code?: string;
  labelKey: string;
  icon: string;
  route: string;
  enabled: boolean;
  sortOrder?: number;
  exact?: boolean;
  requiresAuth?: boolean;
}
