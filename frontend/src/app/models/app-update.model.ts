export interface AppUpdateInfo {
  version: string;
  versionCode?: number;
  mandatory: boolean;
  title?: string;
  message?: string;
  features?: string[];
  bugFixes?: string[];
  apkUrl?: string;
  updateUrl?: string;
  playStoreUrl?: string;
  releaseDate?: string;
}
