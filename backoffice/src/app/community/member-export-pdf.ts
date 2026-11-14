import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MEMBER_PROFESSIONS, MemberExportFilters, MemberExportMember, MemberExportResult } from './community.service';

/** NF-016: one PDF, masjid by masjid, with its members. Built in the browser. */

export function professionLabel(value: string): string {
  return MEMBER_PROFESSIONS.find((p) => p.value === value)?.label ?? 'Not set';
}

export function genderLabel(value: string): string {
  return value === 'm' ? 'Male' : value === 'f' ? 'Female' : 'Not set';
}

export function memberRows(members: MemberExportMember[]): string[][] {
  return members.map((m, i) => [
    String(i + 1),
    m.name || '-',
    m.phone || '-',
    genderLabel(m.gender),
    professionLabel(m.profession),
    m.occupation || '-'
  ]);
}

export interface FilterSummary {
  masjids: string;
  genders: string;
  professions: string;
}

export function summarizeFilters(filters: MemberExportFilters, masjidNames: string[]): FilterSummary {
  const genders = filters.genders.length === 1 ? genderLabel(filters.genders[0]) : 'Male and Female';
  const professions = filters.professions.length ? filters.professions.map(professionLabel).join(', ') : 'All';
  const masjids = filters.masjidIds.length ? masjidNames.join(', ') : 'All masjids';
  return { masjids, genders, professions };
}

export function memberExportFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `masjid-members-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.pdf`;
}

/** Brand colour of the Salah Time logo (dark teal). */
const BRAND: [number, number, number] = [24, 88, 76];

/** Reads the Salah Time logo as a data URL for the PDF header; null if it cannot be loaded. */
export async function loadBrandLogo(url = 'assets/img/salah-time-logo.png'): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function buildMemberExportPdf(result: MemberExportResult, summary: FilterSummary, logoDataUrl: string | null = null): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  const brand = BRAND;

  // Header: Salah Time branding (logo, name, website) with the generated date on the right.
  const logoSize = 40;
  let textX = margin;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, 28, logoSize, logoSize);
      textX = margin + logoSize + 12;
    } catch {
      // Logo unreadable: keep the text-only header.
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...brand);
  doc.text('Salah Time', textX, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text('salah-times.in', textX, 62);
  doc.text(`Generated ${result.generatedAt}`, pageWidth - margin, 46, { align: 'right' });
  doc.setDrawColor(...brand);
  doc.setLineWidth(1);
  doc.line(margin, 78, pageWidth - margin, 78);

  // Title and the filters used.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...brand);
  doc.text('Masjid Members', margin, 102);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60);
  const lines = [
    `Masjids: ${summary.masjids}`,
    `Gender: ${summary.genders}`,
    `Profession: ${summary.professions}`,
    `Total: ${result.total} members in ${result.masjids.length} masjids`
  ];
  let y = 120;
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2) as string[];
    doc.text(wrapped, margin, y);
    y += 14 * wrapped.length;
  }
  y += 8;

  for (const masjid of result.masjids) {
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = 48;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...brand);
    doc.text(masjid.name || 'Masjid', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    const place = [masjid.area, masjid.city].filter(Boolean).join(', ');
    doc.text(`${place ? place + '  ·  ' : ''}${masjid.members.length} members`, margin, y + 14);

    autoTable(doc, {
      startY: y + 22,
      margin: { left: margin, right: margin, bottom: 40 },
      head: [['#', 'Name', 'Phone', 'Gender', 'Profession', 'Occupation / Company']],
      body: memberRows(masjid.members),
      styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: brand, textColor: 255 },
      alternateRowStyles: { fillColor: [244, 248, 245] },
      columnStyles: { 0: { cellWidth: 28, halign: 'right' }, 2: { cellWidth: 95 }, 3: { cellWidth: 60 }, 4: { cellWidth: 90 } }
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 28;
  }

  // Footer on every page: confidentiality note + page numbers.
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130);
    const h = doc.internal.pageSize.getHeight();
    doc.text('Salah Time · salah-times.in  —  Confidential: for masjid program use only. Contains personal phone numbers.', margin, h - 18);
    doc.text(`Page ${i} of ${pages}`, pageWidth - margin, h - 18, { align: 'right' });
  }
  return doc;
}
