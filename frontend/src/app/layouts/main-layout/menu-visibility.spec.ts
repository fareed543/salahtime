import { MenuConfigItem } from 'src/app/models/menu-config.model';
import { isHiddenOnWebsite } from './main-layout.component';

describe('isHiddenOnWebsite', () => {
  const item = (route: string): MenuConfigItem => ({ labelKey: 'X', icon: 'bi-x', route, enabled: true });

  it('hides Notifications from the website side menu', () => {
    expect(isHiddenOnWebsite(item('/notifications'), false)).toBeTrue();
  });

  it('keeps Notifications in the Android app side menu', () => {
    expect(isHiddenOnWebsite(item('/notifications'), true)).toBeFalse();
  });

  it('keeps every other item on the website', () => {
    expect(isHiddenOnWebsite(item('/prayer-times'), false)).toBeFalse();
    expect(isHiddenOnWebsite(item('/'), false)).toBeFalse();
  });
});
