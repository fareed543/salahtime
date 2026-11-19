declare module 'moment-hijri';

/**
 * CR-024: the part of `qrcode` the app uses (ProgramQrService). Declared here because @types/qrcode
 * pulls in @types/node, which this TypeScript version cannot compile.
 */
declare module 'qrcode' {
  export interface QRCodeRenderOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
    scale?: number;
    color?: { dark?: string; light?: string };
  }
  export function toCanvas(canvas: HTMLCanvasElement, text: string, options?: QRCodeRenderOptions): Promise<void>;
  export function toDataURL(text: string, options?: QRCodeRenderOptions): Promise<string>;
}
