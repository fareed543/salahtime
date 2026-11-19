import { ProgramQrService } from './program-qr.service';

/** CR-024: QR card made on the device. */
describe('ProgramQrService', () => {
  const service = new ProgramQrService();

  it('makes a PNG card with the QR, name and dates', async () => {
    const dataUrl = await service.renderCard({
      url: 'https://salah-times.in/register?registrationCode=IFTAR26',
      name: 'Iftar Program at Masjid-e-Azam Frazer Town for the whole month of Ramadan',
      dates: '9 Feb – 10 Mar',
    });
    expect(dataUrl.startsWith('data:image/png;base64,')).toBeTrue();

    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = dataUrl; });
    expect(image.width).toBe(720);
    expect(image.height).toBe(940);
  });

  it('builds a safe file name from the program name and code', () => {
    expect(service.fileName('Iftar @ Masjid Azam!', 'IFTAR26')).toBe('iftar-masjid-azam-iftar26-qr.png');
    expect(service.fileName('', '')).toBe('program-qr.png');
  });
});
