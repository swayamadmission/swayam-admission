import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiPromptsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch a prompt template by name and interpolate variables
   */
  async getPrompt(
    name: string,
    variables: Record<string, string>,
  ): Promise<string> {
    const template = await this.prisma.aIPromptTemplate.findUnique({
      where: { name },
    });

    if (!template) {
      // Fallback defaults if not in DB
      return this.getFallbackPrompt(name, variables);
    }

    if (!template.isActive) {
      throw new NotFoundException(`Prompt template ${name} is inactive.`);
    }

    let content = template.content;

    // Interpolate variables (e.g., replace {{studentName}} with actual name)
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    }

    return content;
  }

  private getFallbackPrompt(
    name: string,
    variables: Record<string, string>,
  ): string {
    const fallbacks = {
      SYSTEM_COUNSELOR: `You are an expert admission counselor for Swayam Admission. Your goal is to guide the student towards the best colleges and careers based on their profile.
      Student Name: {{studentName}}
      Preferred Language: {{language}}
      Always be polite, structured, and do not make up facts.
      CRITICAL PAYMENT RULE: When asked about payment status, fee structure, or verification, ONLY use verified live database facts. Never guess, estimate, or hallucinate payment numbers. If payment proof is pending review, explicitly inform the student: 'Your payment proof has been submitted and is currently under verification by our accounts team.'`,

      RECOMMENDATION_SUMMARY: `Based on the provided college data: {{colleges}}, summarize the top 3 best fits for the student and explain why.`,
    };

    let content = fallbacks[name] || 'You are an AI assistant.';
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    }
    return content;
  }
}
