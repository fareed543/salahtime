export interface MenuItem {
  label: string;
  icon?: string;
  route?: string;
  externalLink?: string;
  target?: string;
  header?: boolean;
  open?: boolean;
  children?: MenuItem[];
}
