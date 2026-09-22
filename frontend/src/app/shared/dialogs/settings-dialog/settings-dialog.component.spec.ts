import { OverlayContainer } from '@angular/cdk/overlay';
import { NgZone } from '@angular/core';
import { SettingsDialogComponent } from './settings-dialog.component';

describe('Settings dialog backdrop scrolling', () => {
  let overlay: HTMLElement;
  let backdrop: HTMLElement;
  let pane: HTMLElement;
  let component: SettingsDialogComponent;

  beforeEach(() => {
    overlay = document.createElement('div');
    backdrop = document.createElement('div');
    pane = document.createElement('div');
    pane.className = 'cdk-overlay-pane';
    overlay.append(backdrop, pane);
    component = new SettingsDialogComponent(
      { getContainerElement: () => overlay } as OverlayContainer,
      new NgZone({ enableLongStackTrace: false })
    );
  });

  afterEach(() => component.ngOnDestroy());

  for (const type of ['wheel', 'touchmove']) {
    it(`blocks ${type} over backdrop and wrapper gaps`, () => {
      for (const target of [backdrop, overlay]) {
        const gesture = new Event(type, { bubbles: true, cancelable: true });
        target.dispatchEvent(gesture);
        expect(gesture.defaultPrevented).toBeTrue();
      }
    });

    it(`allows ${type} inside Settings and nested dialog panes`, () => {
      const nestedPane = document.createElement('div');
      nestedPane.className = 'cdk-overlay-pane';
      overlay.append(nestedPane);
      for (const target of [pane, nestedPane]) {
        const content = document.createElement('div');
        target.append(content);
        const gesture = new Event(type, { bubbles: true, cancelable: true });
        content.dispatchEvent(gesture);
        expect(gesture.defaultPrevented).toBeFalse();
      }
    });

    it(`removes the ${type} blocker on close`, () => {
      component.ngOnDestroy();
      const gesture = new Event(type, { bubbles: true, cancelable: true });
      backdrop.dispatchEvent(gesture);
      expect(gesture.defaultPrevented).toBeFalse();
    });
  }

  it('keeps backdrop clicks available for closing the dialog', () => {
    const click = new Event('click', { bubbles: true, cancelable: true });
    backdrop.dispatchEvent(click);
    expect(click.defaultPrevented).toBeFalse();
  });
});
