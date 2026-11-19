import { ProgramConsoleComponent } from './program-console.component';

/** CR-023 / CR-024: member permission rules and the All / Brothers / Sisters counts (no template needed). */
describe('ProgramConsoleComponent rules', () => {
  const futureProgram = { id: 1, end_date: '2999-12-31', start_date: '2026-01-01' };
  let console: ProgramConsoleComponent;

  beforeEach(() => {
    console = new ProgramConsoleComponent({} as any, {} as any, {} as any);
    console.program = futureProgram;
  });

  const volunteer = { id: 2, role: 2 };
  const subscriber = { id: 3, role: 3 };

  it('admin edits volunteers and subscribers', () => {
    console.viewerRole = 'admin';
    expect(console.canEditMember(volunteer)).toBeTrue();
    expect(console.canEditMember(subscriber)).toBeTrue();
  });

  it('a volunteer edits subscribers only, never another volunteer', () => {
    console.viewerRole = 'volunteer';
    expect(console.canEditMember(subscriber)).toBeTrue();
    expect(console.canEditMember(volunteer)).toBeFalse();
  });

  it('only the admin makes volunteers and sees the remove button on volunteer rows', () => {
    console.viewerRole = 'volunteer';
    expect(console.canMakeVolunteer(subscriber)).toBeFalse();
    expect(console.canRemoveVolunteer(volunteer)).toBeFalse();
    console.viewerRole = 'admin';
    expect(console.canMakeVolunteer(subscriber)).toBeTrue();
    expect(console.canRemoveVolunteer(volunteer)).toBeTrue();
  });

  it('nothing is editable after the program has ended', () => {
    console.viewerRole = 'admin';
    console.program = { ...futureProgram, end_date: '2000-01-01' };
    expect(console.canEditMember(subscriber)).toBeFalse();
    expect(console.canRemoveVolunteer(volunteer)).toBeFalse();
  });

  it('keeps All / Brothers / Sisters counts while a gender filter is on', () => {
    const update = (console as any).updateGenderCounts.bind(console);
    console.genderFilter = '';
    console.counts = { total: 10, m: 6, f: 4 };
    update();
    expect(console.genderCounts).toEqual({ all: 10, m: 6, f: 4 });

    console.genderFilter = 'm';
    console.counts = { total: 7, m: 7, f: 0 }; // the API filters by gender
    update();
    expect(console.genderCounts).toEqual({ all: 10, m: 7, f: 4 });
  });
});

describe('ProgramConsoleComponent distribution (NF-025)', () => {
  let console: ProgramConsoleComponent;
  const row: any = { id: 9, firstname: 'A', lastname: 'B', packets: 2, token: 3, collected_at: '2026-11-19 18:05:00' };

  beforeEach(() => {
    console = new ProgramConsoleComponent({} as any, {} as any, {} as any);
    console.program = { id: 1, start_date: '2026-01-01', end_date: '2999-12-31' };
  });

  it('volunteers undo only today; the admin also on other open days', () => {
    console.viewerRole = 'volunteer';
    console.packetEditable = true;
    console.canCollect = true;
    expect(console.canUndo(row)).toBeTrue();
    console.canCollect = false; // another day
    expect(console.canUndo(row)).toBeFalse();
    console.viewerRole = 'admin';
    expect(console.canUndo(row)).toBeTrue();
    expect(console.canUndo({ ...row, packets: null })).toBeFalse();
  });

  it('shows the collection time in 12-hour form', () => {
    expect(console.collectedTime(row)).toBe('6:05 PM');
    expect(console.collectedTime({ ...row, collected_at: null })).toBe('');
  });
});
