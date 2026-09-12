import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromptManagerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get Active System Prompt (From AIPromptVersion or AISettings)
   */
  async getActiveSystemPrompt(): Promise<string> {
    const publishedPrompt = await this.prisma.aIPromptVersion.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { versionNumber: 'desc' },
    });

    if (publishedPrompt && publishedPrompt.systemPrompt) {
      return publishedPrompt.systemPrompt;
    }

    const settings = await this.prisma.aISettings.findUnique({
      where: { id: 'default_ai_settings' },
    });

    return (
      settings?.systemPrompt ||
      'You are Swayam Admission AI Counselor, an expert educational advisor for top colleges in India. Provide precise, factual guidance using verified internal knowledge.'
    );
  }

  /**
   * Create New System Prompt Version
   */
  async createPromptVersion(
    name: string,
    systemPrompt: string,
    changeLog?: string,
    createdBy?: string,
  ) {
    const lastVersion = await this.prisma.aIPromptVersion.findFirst({
      where: { name },
      orderBy: { versionNumber: 'desc' },
    });

    const versionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Archive previous versions if creating published
    await this.prisma.aIPromptVersion.updateMany({
      where: { name, status: 'PUBLISHED' },
      data: { status: 'ARCHIVED' },
    });

    const newVersion = await this.prisma.aIPromptVersion.create({
      data: {
        name,
        versionNumber,
        systemPrompt,
        status: 'PUBLISHED',
        changeLog,
        createdBy,
      },
    });

    return newVersion;
  }

  /**
   * Rollback Prompt to a Specific Version
   */
  async rollbackPromptVersion(id: string) {
    const target = await this.prisma.aIPromptVersion.findUnique({
      where: { id },
    });
    if (!target) throw new Error('Target prompt version not found');

    await this.prisma.aIPromptVersion.updateMany({
      where: { name: target.name, status: 'PUBLISHED' },
      data: { status: 'ARCHIVED' },
    });

    return await this.prisma.aIPromptVersion.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }

  /**
   * Get Prompt Version History
   */
  async getPromptVersions() {
    return await this.prisma.aIPromptVersion.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
