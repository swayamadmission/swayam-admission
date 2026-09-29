import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class DocumentVaultStorageService {
  private readonly logger = new Logger(DocumentVaultStorageService.name);
  private readonly vaultBaseDir = path.join(process.cwd(), 'storage', 'private_vault', 'documents');
  private readonly legacyUploadsDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.vaultBaseDir)) {
      fs.mkdirSync(this.vaultBaseDir, { recursive: true });
    }
  }

  /**
   * Calculate SHA-256 Checksum
   */
  calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Store a document in the private vault
   * Returns a secure internal storage key: vault://documents/{studentId}/{filename}
   */
  async storeDocument(
    buffer: Buffer,
    studentId: string,
    originalName: string,
  ): Promise<{ storageKey: string; relativePath: string; checksum: string; size: number }> {
    try {
      const studentDir = path.join(this.vaultBaseDir, studentId);
      if (!fs.existsSync(studentDir)) {
        fs.mkdirSync(studentDir, { recursive: true });
      }

      const randomHex = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(originalName).toLowerCase() || '.bin';
      const safeFilename = `doc_${Date.now()}_${randomHex}${ext}`;
      const filePath = path.join(studentDir, safeFilename);

      fs.writeFileSync(filePath, buffer);

      const checksum = this.calculateChecksum(buffer);
      const relativePath = path.posix.join('documents', studentId, safeFilename);
      const storageKey = `vault://${relativePath}`;

      return {
        storageKey,
        relativePath,
        checksum,
        size: buffer.length,
      };
    } catch (err: any) {
      this.logger.error(`Failed to store document in private vault: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Failed to securely store document.');
    }
  }

  /**
   * Retrieve document buffer securely from private vault or legacy storage
   */
  async getDocumentBuffer(storageKeyOrUrl: string): Promise<Buffer> {
    try {
      let resolvedPath: string | null = null;

      if (storageKeyOrUrl.startsWith('vault://')) {
        const rel = storageKeyOrUrl.replace('vault://', '');
        const vaultPath = path.join(process.cwd(), 'storage', 'private_vault', rel);
        if (fs.existsSync(vaultPath)) {
          resolvedPath = vaultPath;
        }
      }

      // Legacy fallback
      if (!resolvedPath) {
        let cleanRel = storageKeyOrUrl;
        if (cleanRel.startsWith('/uploads/')) {
          cleanRel = cleanRel.replace('/uploads/', '');
        } else if (cleanRel.startsWith('uploads/')) {
          cleanRel = cleanRel.replace('uploads/', '');
        }

        const legacyPath = path.join(this.legacyUploadsDir, cleanRel);
        if (fs.existsSync(legacyPath)) {
          resolvedPath = legacyPath;
        }
      }

      // Also check vault directly with stripped path
      if (!resolvedPath) {
        const directVault = path.join(this.vaultBaseDir, path.basename(storageKeyOrUrl));
        if (fs.existsSync(directVault)) {
          resolvedPath = directVault;
        }
      }

      if (!resolvedPath || !fs.existsSync(resolvedPath)) {
        throw new Error(`File not found at storage path.`);
      }

      return fs.readFileSync(resolvedPath);
    } catch (err: any) {
      this.logger.error(`Failed to read document from storage: ${err.message}`);
      throw new InternalServerErrorException('Secure document retrieval failed.');
    }
  }

  /**
   * Delete physical document from private storage
   */
  async deleteDocument(storageKeyOrUrl?: string | null): Promise<boolean> {
    if (!storageKeyOrUrl) return false;
    try {
      let deleted = false;

      // 1. Vault path
      if (storageKeyOrUrl.startsWith('vault://')) {
        const rel = storageKeyOrUrl.replace('vault://', '');
        const vaultPath = path.join(process.cwd(), 'storage', 'private_vault', rel);
        if (fs.existsSync(vaultPath)) {
          fs.unlinkSync(vaultPath);
          deleted = true;
        }
      }

      // 2. Legacy uploads path
      let cleanRel = storageKeyOrUrl;
      if (cleanRel.startsWith('/uploads/')) {
        cleanRel = cleanRel.replace('/uploads/', '');
      } else if (cleanRel.startsWith('uploads/')) {
        cleanRel = cleanRel.replace('uploads/', '');
      }
      const legacyPath = path.join(this.legacyUploadsDir, cleanRel);
      if (fs.existsSync(legacyPath)) {
        fs.unlinkSync(legacyPath);
        deleted = true;
      }

      return deleted;
    } catch (err: any) {
      this.logger.warn(`Failed to physically delete file: ${err.message}`);
      return false;
    }
  }

  /**
   * Check if file exists in storage
   */
  hasDocument(storageKeyOrUrl: string): boolean {
    try {
      if (storageKeyOrUrl.startsWith('vault://')) {
        const rel = storageKeyOrUrl.replace('vault://', '');
        return fs.existsSync(path.join(process.cwd(), 'storage', 'private_vault', rel));
      }
      let cleanRel = storageKeyOrUrl.replace('/uploads/', '').replace('uploads/', '');
      return fs.existsSync(path.join(this.legacyUploadsDir, cleanRel));
    } catch {
      return false;
    }
  }
}
