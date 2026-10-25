import { ScreenHeaderAction, ScreenHeaderComponent } from './screen-header.component';

describe('ScreenHeaderComponent phone ⋮ menu', () => {
  const actions: ScreenHeaderAction[] = [
    { id: 'back', icon: 'bi-arrow-left', ariaLabel: 'Back' },
    { id: 'fullscreen', icon: 'bi-arrows-fullscreen', ariaLabel: 'Full screen' },
    { id: 'photos', icon: 'bi-images', ariaLabel: 'Add photos' },
    { id: 'edit', icon: 'bi-pencil', ariaLabel: 'Edit' },
    { id: 'delete', icon: 'bi-trash', ariaLabel: 'Delete', danger: true }
  ];
  const build = () => {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const header = new ScreenHeaderComponent(router, {} as any);
    header.actions = actions;
    return { header };
  };
  const click = () => jasmine.createSpyObj<Event>('Event', ['stopPropagation']);

  it('keeps the back button out of the menu', () => {
    const { header } = build();
    expect(header.trailingActions.map((action) => action.id)).toEqual(['fullscreen', 'photos', 'edit', 'delete']);
  });

  it('opens and closes from the ⋮ button without the click reaching the page', () => {
    const { header } = build();
    const event = click();
    header.toggleMore(event);
    expect(header.moreOpen).toBeTrue();
    expect(event.stopPropagation).toHaveBeenCalled();
    header.toggleMore(click());
    expect(header.moreOpen).toBeFalse();
  });

  it('closes on a tap elsewhere and on Escape', () => {
    const { header } = build();
    header.toggleMore(click());
    header.closeMore();
    expect(header.moreOpen).toBeFalse();
    header.toggleMore(click());
    header.onEscape();
    expect(header.moreOpen).toBeFalse();
  });

  it('runs the picked action, closes the menu and returns focus to ⋮', () => {
    const { header } = build();
    const picked: ScreenHeaderAction[] = [];
    header.actionSelected.subscribe((action) => picked.push(action));
    const moreButton = jasmine.createSpyObj<HTMLElement>('HTMLElement', ['focus']);
    header.toggleMore(click());
    header.onMenuActionClick(actions[3], moreButton);
    expect(picked.map((action) => action.id)).toEqual(['edit']);
    expect(header.moreOpen).toBeFalse();
    expect(moreButton.focus).toHaveBeenCalled();
  });
});
