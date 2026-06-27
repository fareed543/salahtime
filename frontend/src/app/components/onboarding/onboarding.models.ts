export type OnboardingStep =
  | 'language'
  | 'location'
  | 'search'
  | 'confirm-location'
  | 'notifications'
  | 'madhab';

export type OnboardingLocationSelection =
  | { source: 'manual'; city: any }
  | { source: 'auto'; city: any };
