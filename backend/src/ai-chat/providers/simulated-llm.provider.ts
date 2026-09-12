import { Injectable } from '@nestjs/common';
import { ILLMProvider } from '../interfaces/llm-provider.interface';

@Injectable()
export class SimulatedLLMProvider implements ILLMProvider {
  async generateResponse(
    prompt: string,
    context: Record<string, any>,
  ): Promise<string> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate LLM context processing
    const hasColleges = context.colleges && context.colleges.length > 0;

    if (hasColleges) {
      const names = context.colleges
        .map((c: any) => c.college.name)
        .slice(0, 3)
        .join(', ');
      return `Based on your profile and preferences, I found some excellent options for you. For instance, ${names} are highly recommended. Would you like to know more about the placement records or fee structure of these institutions?`;
    }

    return `I can definitely help you with that! To give you the most accurate recommendations, could you tell me a little more about your budget or preferred location?`;
  }

  async generateStructuredData<T>(
    prompt: string,
    schema: any,
    context?: Record<string, any>,
  ): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {} as T;
  }
}
