import { Injectable } from '@nestjs/common';
import { LocalStorageService } from './providers/local-storage.service';

export interface IStorageService {
  uploadFile(file: Express.Multer.File, folder?: string): Promise<string>;
  deleteFile(fileUrl: string): Promise<boolean>;
  getSignedUrl(fileUrl: string): Promise<string>;
}

@Injectable()
export class StorageService implements IStorageService {
  private provider: IStorageService;

  constructor(private readonly localStorageService: LocalStorageService) {
    const storageType = process.env.STORAGE_PROVIDER || 'LOCAL';

    switch (storageType) {
      case 'LOCAL':
      default:
        this.provider = this.localStorageService;
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<string> {
    return this.provider.uploadFile(file, folder);
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    return this.provider.deleteFile(fileUrl);
  }

  async getSignedUrl(fileUrl: string): Promise<string> {
    return this.provider.getSignedUrl(fileUrl);
  }
}
