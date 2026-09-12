export interface ILLMProvider {
  /**
   * Generate a conversational response based on the prompt and context.
   */
  generateResponse(
    prompt: string,
    context: Record<string, any>,
  ): Promise<string>;

  /**
   * Generate structured data matching a specific JSON schema.
   */
  generateStructuredData<T>(
    prompt: string,
    schema: any,
    context?: Record<string, any>,
  ): Promise<T>;
}
