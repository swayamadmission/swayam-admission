import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';

export interface WatermarkOptions {
  staffId: string;
  dateStr?: string; // Format: DD/MM/YYYY
  applicationId?: string;
  reason?: string;
}

@Injectable()
export class DocumentWatermarkService {
  private readonly logger = new Logger(DocumentWatermarkService.name);

  /**
   * Format a date into authoritative Indian DD/MM/YYYY format
   */
  public formatAccessDate(date: Date = new Date()): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Watermark a PDF buffer server-side
   */
  async watermarkPdf(pdfBuffer: Buffer, options: WatermarkOptions): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();

      const accessDate = options.dateStr || this.formatAccessDate();
      const lines = [
        'SWAYAM ADMISSION',
        'CONFIDENTIAL',
        `Staff ID: ${options.staffId}`,
        `Accessed: ${accessDate}`,
        ...(options.applicationId ? [`App ID: ${options.applicationId}`] : []),
      ];

      for (const page of pages) {
        const { width, height } = page.getSize();
        const centerX = width / 2;
        const centerY = height / 2;

        page.drawText(lines[0], {
          x: centerX - 140,
          y: centerY + 45,
          size: 26,
          font,
          color: rgb(0.8, 0.2, 0.2),
          opacity: 0.25,
          rotate: degrees(45),
        });

        page.drawText(lines[1], {
          x: centerX - 105,
          y: centerY + 15,
          size: 22,
          font,
          color: rgb(0.8, 0.2, 0.2),
          opacity: 0.25,
          rotate: degrees(45),
        });

        page.drawText(lines[2], {
          x: centerX - 90,
          y: centerY - 15,
          size: 15,
          font,
          color: rgb(0.25, 0.25, 0.25),
          opacity: 0.35,
          rotate: degrees(45),
        });

        page.drawText(lines[3], {
          x: centerX - 90,
          y: centerY - 38,
          size: 15,
          font,
          color: rgb(0.25, 0.25, 0.25),
          opacity: 0.35,
          rotate: degrees(45),
        });

        if (lines[4]) {
          page.drawText(lines[4], {
            x: centerX - 90,
            y: centerY - 60,
            size: 13,
            font,
            color: rgb(0.25, 0.25, 0.25),
            opacity: 0.35,
            rotate: degrees(45),
          });
        }
      }

      const watermarkedBytes = await pdfDoc.save();
      return Buffer.from(watermarkedBytes);
    } catch (err: any) {
      this.logger.error(`PDF watermarking failed: ${err.message}`, err.stack);
      // FAIL SECURELY: Never return raw unwatermarked document
      throw new InternalServerErrorException(
        'Security watermarking failed. Access to raw document was blocked.',
      );
    }
  }

  /**
   * Watermark an image buffer (JPEG, PNG) server-side
   */
  async watermarkImage(imageBuffer: Buffer, options: WatermarkOptions): Promise<Buffer> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 1000;
      const accessDate = options.dateStr || this.formatAccessDate();

      const fontSizeTitle = Math.max(18, Math.round(width * 0.04));
      const fontSizeSub = Math.max(13, Math.round(width * 0.024));

      const svgOverlay = `
        <svg width="${width}" height="${height}">
          <style>
            .wm-title { fill: rgba(185, 28, 28, 0.28); font-size: ${fontSizeTitle}px; font-weight: 800; font-family: sans-serif; text-anchor: middle; letter-spacing: 2px; }
            .wm-sub { fill: rgba(45, 55, 72, 0.35); font-size: ${fontSizeSub}px; font-weight: 700; font-family: sans-serif; text-anchor: middle; }
          </style>
          <g transform="rotate(-35, ${width / 2}, ${height / 2})">
            <text x="${width / 2}" y="${height / 2 - fontSizeTitle * 1.6}" class="wm-title">SWAYAM ADMISSION</text>
            <text x="${width / 2}" y="${height / 2 - fontSizeTitle * 0.4}" class="wm-title">CONFIDENTIAL</text>
            <text x="${width / 2}" y="${height / 2 + fontSizeSub * 1.5}" class="wm-sub">Staff ID: ${options.staffId}</text>
            <text x="${width / 2}" y="${height / 2 + fontSizeSub * 3.0}" class="wm-sub">Accessed: ${accessDate}</text>
            ${options.applicationId ? `<text x="${width / 2}" y="${height / 2 + fontSizeSub * 4.5}" class="wm-sub">App ID: ${options.applicationId}</text>` : ''}
          </g>
        </svg>
      `;

      return await sharp(imageBuffer)
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .toBuffer();
    } catch (err: any) {
      this.logger.error(`Image watermarking failed: ${err.message}`, err.stack);
      // FAIL SECURELY
      throw new InternalServerErrorException(
        'Security watermarking failed. Access to raw document was blocked.',
      );
    }
  }

  /**
   * Apply watermark based on MIME type or extension
   */
  async watermarkDocument(
    buffer: Buffer,
    mimeType: string,
    options: WatermarkOptions,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const isPdf = mimeType === 'application/pdf';
    const isImage = mimeType.startsWith('image/');

    if (isPdf) {
      const wm = await this.watermarkPdf(buffer, options);
      return { buffer: wm, mimeType: 'application/pdf' };
    }

    if (isImage) {
      const wm = await this.watermarkImage(buffer, options);
      return { buffer: wm, mimeType: mimeType || 'image/jpeg' };
    }

    // Default: treat as PDF if unknown or throw secure failure
    try {
      const wm = await this.watermarkPdf(buffer, options);
      return { buffer: wm, mimeType: 'application/pdf' };
    } catch {
      throw new InternalServerErrorException(
        `Unsupported document format for staff watermarking: ${mimeType}`,
      );
    }
  }
}
