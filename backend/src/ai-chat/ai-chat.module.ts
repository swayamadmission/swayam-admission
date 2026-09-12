import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { SimulatedLLMProvider } from './providers/simulated-llm.provider';

@Module({
  controllers: [AiChatController],
  providers: [
    AiChatService,
    {
      provide: 'ILLMProvider',
      useClass: SimulatedLLMProvider,
    },
  ],
  exports: ['ILLMProvider', AiChatService],
})
export class AiChatModule {}
