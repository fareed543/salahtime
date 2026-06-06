export interface MenuConfigItem {
  id?: number;
  code?: string;
  labelKey: string;
  icon: string;
  route: string;
  enabled: boolean;
  sortOrder?: number;
  exact?: boolean;
}

export interface MenuConfig {
  sidebar: MenuConfigItem[];
  shortcuts: MenuConfigItem[];
}

export interface ManagedMenuResponse {
  modules: MenuConfigItem[];
}
