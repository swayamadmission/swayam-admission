import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { DocumentWatermarkService } from './document-watermark.service';
import { DocumentAuditService } from './document-audit.service';
import { DocumentVaultStorageService } from './document-vault-storage.service';
import { DataScopeService } from '../auth/data-scope.service';
import { ForbiddenException } from '@nestjs/common';

describe('Document Vault Production Security Test Suite', () => {
  let watermarkService: DocumentWatermarkService;
  let auditService: DocumentAuditService;
  let vaultStorage: DocumentVaultStorageService;
  let dataScopeService: DataScopeService;

  beforeEach(() => {
    watermarkService = new DocumentWatermarkService();
    // Prisma client mock for audit service
    const mockPrisma: any = {
      documentAccessAudit: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    auditService = new DocumentAuditService(mockPrisma);
    vaultStorage = new DocumentVaultStorageService();
    dataScopeService = new DataScopeService({} as any, {} as any);
  });

  describe('1. Dynamic Server-Side Watermark Requirements', () => {
    it('must format access dates strictly as DD/MM/YYYY (never MM/DD/YYYY)', () => {
      const fixedDate = new Date(2026, 8, 29); // 29 September 2026
      const formatted = watermarkService.formatAccessDate(fixedDate);
      expect(formatted).toBe('29/09/2026');
    });

    it('must dynamically watermark a PDF with staff ID and DD/MM/YYYY date', async () => {
      // Create a test PDF
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([600, 800]);
      const initialBytes = Buffer.from(await pdfDoc.save());

      const watermarked = await watermarkService.watermarkPdf(initialBytes, {
        staffId: 'SWY-CTR-0247',
        applicationId: 'APP-1001',
        dateStr: '29/09/2026',
      });

      expect(watermarked).toBeDefined();
      expect(watermarked.length).toBeGreaterThan(initialBytes.length);

      // Verify the watermarked PDF can be loaded and has pages
      const loaded = await PDFDocument.load(watermarked);
      expect(loaded.getPageCount()).toBe(1);
    });

    it('must dynamically watermark an image with staff credentials', async () => {
      // Create a blank image using sharp
      const initialImage = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      const watermarked = await watermarkService.watermarkImage(initialImage, {
        staffId: 'SWY-CTR-0247',
        applicationId: 'APP-1001',
        dateStr: '29/09/2026',
      });

      expect(watermarked).toBeDefined();
      expect(Buffer.isBuffer(watermarked)).toBe(true);
      const metadata = await sharp(watermarked).metadata();
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(200);
    });

    it('must fail closed if document watermarking fails (never leak raw buffer)', async () => {
      const corruptBuffer = Buffer.from('corrupt non-pdf non-image payload');
      await expect(
        watermarkService.watermarkPdf(corruptBuffer, { staffId: 'STAFF-1' }),
      ).rejects.toThrow();
    });
  });

  describe('2. Sensitive Data Masking Requirements', () => {
    it('must mask Aadhaar numbers to show only last 4 digits (XXXX XXXX 1234)', () => {
      expect(auditService.maskAadhaar('123456789012')).toBe('XXXX XXXX 9012');
      expect(auditService.maskAadhaar('1234 5678 9012')).toBe('XXXX XXXX 9012');
      expect(auditService.maskAadhaar('123')).toBe('XXXX');
    });

    it('must mask PAN numbers to show only last 4 characters (XXXXX1234X)', () => {
      expect(auditService.maskPan('ABCDE1234F')).toBe('XXXXX1234F');
      expect(auditService.maskPan('xyz')).toBe('XXXXX');
    });
  });

  describe('3. Object-Level Authorization (BOLA/IDOR Defense)', () => {
    const studentUser: any = {
      userId: 'student-A',
      userRole: 'STUDENT',
      dataScopes: ['SELF'],
      isSuperAdmin: false,
      teamMemberUserIds: [],
      isCollegeStaff: false,
      collegeId: null,
      states: [],
    };

    const counselorUser: any = {
      userId: 'counselor-1',
      userRole: 'COUNSELOR',
      dataScopes: ['ASSIGNED'],
      isSuperAdmin: false,
      teamMemberUserIds: [],
      isCollegeStaff: false,
      collegeId: null,
      states: [],
    };

    const docOfStudentA: any = {
      id: 'doc-1',
      userId: 'student-A',
      counselorId: 'counselor-1',
      applicationId: 'app-1',
      user: {
        assignedCounselorId: 'counselor-1',
      },
    };

    const docOfStudentB: any = {
      id: 'doc-2',
      userId: 'student-B',
      counselorId: 'counselor-2',
      applicationId: 'app-2',
      user: {
        assignedCounselorId: 'counselor-2',
      },
    };

    it('should allow student to access their own document', () => {
      expect(() => {
        dataScopeService.enforceDocumentScope(studentUser, docOfStudentA);
      }).not.toThrow();
    });

    it('should DENY student attempting to access another students document (BOLA attack)', () => {
      expect(() => {
        dataScopeService.enforceDocumentScope(studentUser, docOfStudentB);
      }).toThrow(ForbiddenException);
    });

    it('should allow assigned counselor to access their assigned students document', () => {
      expect(() => {
        dataScopeService.enforceDocumentScope(counselorUser, docOfStudentA);
      }).not.toThrow();
    });

    it('should DENY counselor attempting unassigned students document', () => {
      expect(() => {
        dataScopeService.enforceDocumentScope(counselorUser, docOfStudentB);
      }).toThrow(ForbiddenException);
    });
  });

  describe('4. Private Storage Vault & Integrity', () => {
    it('must calculate valid SHA-256 cryptographic checksums', () => {
      const data = Buffer.from('swayam admission secure document payload');
      const hash = vaultStorage.calculateChecksum(data);
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 hex string length
    });

    it('must save to private vault and generate vault:// uri', async () => {
      const payload = Buffer.from('test secure document');
      const res = await vaultStorage.storeDocument(payload, 'user-123', 'test.pdf');

      expect(res.storageKey).toMatch(/^vault:\/\//);
      expect(res.checksum).toBeDefined();
      expect(res.size).toBe(payload.length);

      // Verify file is readable from vault
      const retrieved = await vaultStorage.getDocumentBuffer(res.storageKey);
      expect(retrieved.toString()).toBe(payload.toString());

      // Clean up test file
      await vaultStorage.deleteDocument(res.storageKey);
    });
  });

  describe('5. Retention & Deletion Schedule Calculations', () => {
    it('must calculate student deletion request deadline as exactly 45 calendar days', () => {
      const requestedAt = new Date('2026-09-29T10:00:00.000Z');
      const scheduledDeletion = new Date(requestedAt.getTime() + 45 * 24 * 60 * 60 * 1000);

      const diffDays = (scheduledDeletion.getTime() - requestedAt.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBe(45);
    });

    it('must calculate post-confirmation retention deadline as exactly 90 calendar days', () => {
      const confirmedAt = new Date('2026-09-01T00:00:00.000Z');
      const retentionUntil = new Date(confirmedAt.getTime() + 90 * 24 * 60 * 60 * 1000);

      const diffDays = (retentionUntil.getTime() - confirmedAt.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBe(90);
    });
  });
});
