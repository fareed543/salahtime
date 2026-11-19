import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export type ScanOutcome =
  | { kind: 'text'; text: string }
  | { kind: 'cancelled' }
  | { kind: 'web' }          // no camera scanning on the website: use "Mark collected"
  | { kind: 'installing' }   // Google's scanner module is being downloaded on this phone
  | { kind: 'error'; message: string };

/**
 * NF-025: reads a subscriber's pass with Google's code scanner (ML Kit). The scanner screen is Google's own,
 * so the app needs no camera screen of its own. The plugin is loaded only when Scan is tapped.
 */
@Injectable({ providedIn: 'root' })
export class ProgramScanService {
  get canScan(): boolean {
    return Capacitor.isNativePlatform();
  }

  async scan(): Promise<ScanOutcome> {
    if (!this.canScan) {
      return { kind: 'web' };
    }
    try {
      const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning');
      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        return { kind: 'installing' };
      }
      const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
      const text = barcodes?.[0]?.rawValue ?? '';
      return text ? { kind: 'text', text } : { kind: 'cancelled' };
    } catch (error: any) {
      const message = String(error?.message ?? error ?? '');
      if (/cancel/i.test(message)) {
        return { kind: 'cancelled' };
      }
      return { kind: 'error', message };
    }
  }
}
