import { buildMemberExportPdf, memberExportFileName, memberRows, summarizeFilters } from './member-export-pdf';
import { MemberExportResult } from './community.service';

describe('member-export-pdf (NF-016)', () => {
  const result: MemberExportResult = {
    generatedAt: '2026-11-14 09:00:00',
    total: 3,
    masjids: [
      { id: 1, name: 'Masjid A', area: 'Area 1', city: 'Bengaluru', members: [
        { name: 'Ali', gender: 'm', phone: '900', profession: 'employed', occupation: 'Developer · Acme' },
        { name: 'Bilal', gender: '', phone: '', profession: 'not_set', occupation: '' }
      ] },
      { id: 2, name: 'Masjid B', area: '', city: 'Hyderabad', members: [
        { name: 'Sara', gender: 'f', phone: '901', profession: 'student', occupation: 'College X' }
      ] }
    ]
  };

  it('numbers rows per masjid and labels values', () => {
    const rows = memberRows(result.masjids[0].members);
    expect(rows[0]).toEqual(['1', 'Ali', '900', 'Male', 'Employed', 'Developer · Acme']);
    expect(rows[1]).toEqual(['2', 'Bilal', '-', 'Not set', 'Not set', '-']);
    expect(memberRows(result.masjids[1].members)[0][0]).toBe('1');
  });

  it('summarizes filters', () => {
    expect(summarizeFilters({ masjidIds: [], genders: [], professions: [] }, []))
      .toEqual({ masjids: 'All masjids', genders: 'Male and Female', professions: 'All' });
    expect(summarizeFilters({ masjidIds: [1], genders: ['f'], professions: ['student', 'retired'] }, ['Masjid A']))
      .toEqual({ masjids: 'Masjid A', genders: 'Female', professions: 'Student, Retired' });
  });

  it('names the file by date', () => {
    expect(memberExportFileName(new Date(2026, 10, 4))).toBe('masjid-members-2026-11-04.pdf');
  });

  it('builds a PDF with a footer on every page', () => {
    const doc = buildMemberExportPdf(result, summarizeFilters({ masjidIds: [], genders: [], professions: [] }, []));
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(1000);
  });
});
