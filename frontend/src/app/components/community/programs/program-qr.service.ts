import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface ProgramQrCard {
  /** What the QR opens (always the public site, see PRG-R21). */
  url: string;
  name: string;
  dates: string;
}

const WIDTH = 720;
const HEIGHT = 940;
const QR_SIZE = 520;
const BRAND = '#117463';
const INK = '#11483f';

/**
 * CR-024 (PRG-R21): the program's registration QR made on the device — no outside QR service —
 * as a card with the program name, dates and the SalahTime mark, so people know it is ours.
 * Download saves a PNG (Android: Documents/SalahTime; web: browser download); Share opens the share sheet.
 */
@Injectable({ providedIn: 'root' })
export class ProgramQrService {
  private qr?: Promise<typeof import('qrcode')>;

  /**
   * A QR with the SalahTime logo in the middle (like payment-app QRs), so people know it is ours.
   * Uses error correction H (30 %): the logo covers ~5 % of the code, so it still scans reliably.
   */
  async renderQr(text: string, size: number, margin = 0, dark = INK): Promise<HTMLCanvasElement> {
    const QRCode = await this.loadQr();
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, text, { errorCorrectionLevel: 'H', margin, width: size, color: { dark, light: '#ffffff' } });
    const ctx = canvas.getContext('2d');
    const logo = await this.loadLogo();
    if (ctx && logo) {
      const w = canvas.width;
      const badge = Math.round(w * 0.22);
      const x = Math.round((w - badge) / 2);
      // White rounded square behind the logo so its edge never merges with the modules.
      ctx.fillStyle = '#ffffff';
      this.roundRect(ctx, x, x, badge, badge, badge * 0.24);
      ctx.fill();
      const pad = Math.round(badge * 0.08);
      ctx.drawImage(logo, x + pad, x + pad, badge - pad * 2, badge - pad * 2);
    }
    return canvas;
  }

  /** PNG data URL of the full card. */
  async renderCard(card: ProgramQrCard): Promise<string> {
    const qrCanvas = await this.renderQr(card.url, QR_SIZE);

    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return qrCanvas.toDataURL('image/png');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = 'rgba(17, 116, 99, 0.25)';
    ctx.lineWidth = 4;
    this.roundRect(ctx, 14, 14, WIDTH - 28, HEIGHT - 28, 36);
    ctx.stroke();

    const qrTop = 64;
    ctx.drawImage(qrCanvas, (WIDTH - QR_SIZE) / 2, qrTop, QR_SIZE, QR_SIZE);

    const font = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Program name: bold, up to two lines.
    ctx.fillStyle = INK;
    ctx.font = `700 44px ${font}`;
    const nameLines = this.wrap(ctx, card.name, WIDTH - 120, 2);
    let y = qrTop + QR_SIZE + 78;
    for (const line of nameLines) {
      ctx.fillText(line, WIDTH / 2, y);
      y += 54;
    }

    if (card.dates) {
      ctx.fillStyle = '#5f7470';
      ctx.font = `500 30px ${font}`;
      ctx.fillText(card.dates, WIDTH / 2, y + 6);
    }

    // Brand mark at the bottom: "SalahTime", and the website in smaller letters on the next line.
    ctx.fillStyle = BRAND;
    ctx.font = `700 32px ${font}`;
    ctx.fillText('SalahTime', WIDTH / 2, HEIGHT - 70);
    ctx.fillStyle = '#5f7470';
    ctx.font = `500 22px ${font}`;
    ctx.fillText('salah-times.in', WIDTH / 2, HEIGHT - 40);

    return canvas.toDataURL('image/png');
  }

  /** Returns where it was saved on Android ('Documents/SalahTime/…'), or null on the web (browser download). */
  async download(dataUrl: string, fileName: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return null;
    }
    try {
      await Filesystem.requestPermissions();
    } catch {
      // Android 11+ does not need it for the app's own files.
    }
    const path = `SalahTime/${fileName}`;
    await Filesystem.writeFile({ path, data: this.base64(dataUrl), directory: Directory.Documents, recursive: true });
    return `Documents/${path}`;
  }

  /** Share sheet with the image (Android) / Web Share with a file; falls back to a download. */
  async share(dataUrl: string, fileName: string, title: string, text: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        const saved = await Filesystem.writeFile({ path: fileName, data: this.base64(dataUrl), directory: Directory.Cache });
        await Share.share({ title, text, files: [saved.uri], dialogTitle: title });
        return;
      }
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, text, files: [file] });
        return;
      }
    } catch (error: any) {
      if (error?.name === 'AbortError' || /cancel/i.test(String(error?.message ?? error))) {
        return;
      }
    }
    await this.download(dataUrl, fileName);
  }

  fileName(name: string, code: string): string {
    const slug = `${name || 'program'}-${code || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return `${slug || 'program'}-qr.png`;
  }

  private logo?: Promise<HTMLImageElement | null>;

  /** The app logo (assets/images/logo.png); null if it cannot load — the QR is then drawn without it. */
  private loadLogo(): Promise<HTMLImageElement | null> {
    this.logo ??= new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = 'assets/images/logo.png';
    });
    return this.logo;
  }

  private loadQr(): Promise<typeof import('qrcode')> {
    this.qr ??= import('qrcode');
    return this.qr;
  }

  private base64(dataUrl: string): string {
    return dataUrl.slice(dataUrl.indexOf(',') + 1);
  }

  private wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
        continue;
      }
      lines.push(line);
      line = word;
      if (lines.length === maxLines) {
        break;
      }
    }
    if (lines.length < maxLines && line) {
      lines.push(line);
    } else if (line && lines.length === maxLines) {
      // Text left over: end the last line with an ellipsis.
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last.trimEnd()}…`;
    }
    return lines.map((value) => this.fit(ctx, value, maxWidth));
  }

  private fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let value = text;
    while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
      value = value.slice(0, -1);
    }
    return `${value}…`;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
