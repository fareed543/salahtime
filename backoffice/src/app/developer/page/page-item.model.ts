export interface PageItem {
  id?: number;
  title: string;
  heading?: string;
  subHeading?: string;
  shortDescription?: string;
  description?: string;
  image?: string;

  slug?: string;
  icon?: string;
  parentId?: number | null;

  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  tags?: string[];

  children?: PageItem[];
  open?: boolean;
}
