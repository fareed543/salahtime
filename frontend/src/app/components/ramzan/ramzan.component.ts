import { Component, NgZone, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef, ViewChild } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Subscription, filter, delay } from 'rxjs';
import { WaqtService } from 'src/app/services/waqt.service';
import { SettingsService } from 'src/app/services/settings.service';
import * as moment from 'moment-hijri';
import 'moment-timezone';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface RamzanDay {
  day: number;
  date: Date;
  sehriEnd: Date;
  iftarStart: Date;
}

@Component({
  selector: 'app-ramzan',
  templateUrl: './ramzan.component.html',
  styleUrls: ['./ramzan.component.scss']
})
export class RamzanComponent implements OnInit, OnDestroy {
  @ViewChildren('ramzanRow') ramzanRows!: QueryList<ElementRef>;
  @ViewChild('pdfContent') pdfContent?: ElementRef<HTMLElement>;
  ramzanDays: RamzanDay[] = [];
  loading = true;
  errorMessage: string | null = null;
  shareStatus = '';

  settings: any = null;

  private subs = new Subscription();
  private isCalculated = false;

  constructor(
    private waqtService: WaqtService,
    private settingsService: SettingsService,
    private ngZone: NgZone
  ) { }

  // ------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------

  ngOnInit(): void {
    const sub = this.settingsService.settings$
      .pipe(
        filter(settings => !!settings),
        delay(0) // allow UI to settle
      )
      .subscribe(settings => {
        this.settings = settings;
        this.isCalculated = false;
        this.getLocationAndRamzan();
      });

    this.subs.add(sub);



  }

  scrollToToday() {
    const index = this.ramzanDays.findIndex(day => this.isToday(day.date));

    if (index !== -1 && this.ramzanRows) {
      const element = this.ramzanRows.toArray()[index];

      element.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ------------------------------------------------------
  // Location (FROM SETTINGS ONLY)
  // ------------------------------------------------------

  private async getLocationAndRamzan() {
    this.loading = true;
    this.errorMessage = null;

    try {
      const location = this.settings?.location;

      if (!location) {
        throw new Error('Location not set');
      }

      let lat: number;
      let lng: number;

      if (location.source === 'manual') {
        lat = location.city.coordinates.latitude;
        lng = location.city.coordinates.longitude;
      } else {
        lat = location.city.coordinates.latitude;
        lng = location.city.coordinates.longitude;
      }

      this.ngZone.run(() => {
        this.generateRamzanCalendar(lat, lng);
      });

    } catch {
      this.ngZone.run(() => {
        this.errorMessage =
          'Please select a city or enable auto location from settings.';
        this.loading = false;
      });
    }
  }

  // ------------------------------------------------------
  // Core logic
  // ------------------------------------------------------



  private generateRamzanCalendar(lat: number, lng: number) {
    if (this.isCalculated) return;
    this.isCalculated = true;

    try {
      const tzOffset = -new Date().getTimezoneOffset() / 60;
      const today = moment().tz('Asia/Kolkata'); // today in India
      let hijriYear = today.iYear();
      let ramzanStart = this.getRamzanStart(hijriYear);
      let ramzanEnd = ramzanStart.clone().add(1, 'iMonth');

      // Before Ramadan: show this year's upcoming Ramadan.
      // During Ramadan: keep this Ramadan.
      // After Ramadan: show next year's Ramadan.
      if (today.isSameOrAfter(ramzanEnd, 'day')) {
        hijriYear += 1;
        ramzanStart = this.getRamzanStart(hijriYear);
        ramzanEnd = ramzanStart.clone().add(1, 'iMonth');
      }

      const ramzanDaysCount = ramzanEnd.diff(ramzanStart, 'days');

      const methodId = this.settings.calculationMethod ?? 'karachi';
      const madhab = this.settings.madhab ?? 'Hanafi';

      const days: RamzanDay[] = [];

      for (let i = 0; i < ramzanDaysCount; i++) {
        const date = ramzanStart.clone().add(i, 'days').toDate();

        const times = this.waqtService.getTimes(
          date,
          lat,
          lng,
          tzOffset,
          methodId,
          madhab,
          {
            sahriOffset: this.settings.sahriOffset,
            fajrOffset: this.settings.fajrOffset,
            dhuhrOffset: this.settings.dhuhrOffset,
            asrOffset: this.settings.asrOffset,
            iftarOffset: this.settings.iftarOffset,
            maghribOffset: this.settings.maghribOffset,
            ishaOffset: this.settings.ishaOffset
          }
        );

        days.push({
          day: i + 1,
          date,
          sehriEnd: new Date(times.sahri.end),
          iftarStart: new Date(times.maghrib.start)
        });
      }

      this.ngZone.run(() => {
        this.ramzanDays = days;
        this.loading = false;
          setTimeout(() => {
            this.scrollToToday();
          }, 100);
      });

    } catch {
      this.ngZone.run(() => {
        this.loading = false;
        this.errorMessage = 'Failed to calculate Ramzan timings.';
      });
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  async downloadCalendar(): Promise<void> {
    try {
      const pdfBlob = await this.generateCalendarPdfBlob();
      const baseFileName = this.buildExportFileName();

      if (Capacitor.isNativePlatform()) {
        await this.writeBlobToDevice(`${baseFileName}.pdf`, pdfBlob);
      } else {
        this.downloadBlob(`${baseFileName}.pdf`, pdfBlob);
      }

      this.setShareStatus('Ramzan calendar PDF downloaded successfully.');
    } catch {
      this.setShareStatus('Unable to generate Ramzan calendar PDF right now.');
    }
  }

  async shareCalendar(): Promise<void> {
    try {
      const pdfBlob = await this.generateCalendarPdfBlob();
      const baseFileName = `${this.buildExportFileName()}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const saved = await this.writeBlobToDevice(baseFileName, pdfBlob, false);
        if (saved?.uri) {
          await Share.share({
            title: 'Ramzan Calendar',
            url: saved.uri
          });
          this.setShareStatus('Ramzan calendar PDF shared successfully.');
          return;
        }
      }

      const file = new File([pdfBlob], baseFileName, { type: 'application/pdf' });

      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({
          title: 'Ramzan Calendar',
          files: [file]
        });
        this.setShareStatus('Ramzan calendar PDF shared successfully.');
      } else {
        this.downloadBlob(baseFileName, pdfBlob);
        this.setShareStatus('Sharing is not supported here, so the PDF was downloaded instead.');
      }
    } catch {
      this.setShareStatus('Unable to share PDF right now.');
    }
  }

  private async generateCalendarPdfBlob(): Promise<Blob> {
    if (!this.pdfContent?.nativeElement || !this.ramzanDays.length) {
      throw new Error('Ramzan calendar is not ready yet.');
    }

    const canvas = await html2canvas(this.pdfContent.nativeElement, {
      backgroundColor: '#eaf5f1',
      scale: Math.min(window.devicePixelRatio || 2, 3),
      useCORS: true
    });

    const imageData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imageData, 'PNG', 0, 0, canvas.width, canvas.height);
    return pdf.output('blob');
  }

  private buildExportFileName(): string {
    return 'Salahtime-ramzan-calendar';
  }

  private downloadBlob(fileName: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async writeBlobToDevice(fileName: string, blob: Blob, updateStatus = false): Promise<{ uri?: string }> {
    try {
      await Filesystem.requestPermissions();
    } catch {}

    const base64Data = await this.blobToBase64(blob);

    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Documents
    });

    if (updateStatus) {
      this.setShareStatus('Ramzan calendar PDF saved on your device.');
    }

    return result;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('Failed to read file.'));
          return;
        }

        resolve(result.split(',')[1] ?? '');
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private setShareStatus(message: string): void {
    this.shareStatus = message;
    setTimeout(() => this.shareStatus = '', 2500);
  }

  getExportLocationLabel(): string {
    const city = this.settings?.location?.city;
    const latitude = city?.coordinates?.latitude;
    const longitude = city?.coordinates?.longitude;

    if (latitude != null && longitude != null) {
      return `Current Location (Lat: ${Number(latitude).toFixed(4)}, Lng: ${Number(longitude).toFixed(4)})`;
    }

    return this.settings?.location?.city?.city || this.settings?.city?.city || 'Selected location';
  }

  get ramzanTitle(): string {
    if (!this.ramzanDays.length) {
      return 'Ramzan';
    }

    return `Ramzan ${this.ramzanDays[0].date.getFullYear()}`;
  }

  private getRamzanStart(hijriYear: number) {
    return moment(`${hijriYear}/09/01`, 'iYYYY/iMM/iDD').tz('Asia/Kolkata').startOf('day');
  }

}
