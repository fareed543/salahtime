export interface MenuConfigItem {
  labelKey: string;
  icon: string;
  route: string;
  enabled: boolean;
  exact?: boolean;
}

export interface MenuConfig {
  sidebar: MenuConfigItem[];
  shortcuts: MenuConfigItem[];
}
