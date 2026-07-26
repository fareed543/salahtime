export interface MenuItem {
  id?: number;
  code?: string;
  label?: string;
  labelKey?: string;
  icon?: string;
  route?: string;
  enabled?: boolean;
  sortOrder?: number;
  exact?: boolean;
  requiresAuth?: boolean;
  allowedRoles?: string[];
  children?: MenuItem[];
  externalLink?: string;
  header?: boolean;
  target?: string;
  open?: boolean;
}
