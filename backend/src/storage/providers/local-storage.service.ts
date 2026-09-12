import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageService } from '../storage.service';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<string> {
    try {
      const targetDir = path.join(this.uploadDir, folder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
      const filePath = path.join(targetDir, filename);

      fs.writeFileSync(filePath, file.buffer);

      // Return a relative URL path that can be served statically
      return `/uploads/${folder}/${filename}`;
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload file locally');
    }
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // url format: /uploads/folder/filename
      const relativePath = fileUrl.replace('/uploads/', '');
      const filePath = path.join(this.uploadDir, relativePath);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async getSignedUrl(fileUrl: string): Promise<string> {
    // Local storage doesn't typically need signed URLs if served statically,
    // but we can just return the URL or implement a token-based access later.
    return fileUrl;
  }
}
