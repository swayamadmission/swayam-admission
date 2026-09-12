import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIMessageRole, Prisma } from '@prisma/client';

@Injectable()
export class AiMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(userId: string, title?: string) {
    const conversation = await this.prisma.aIConversation.create({
      data: {
        userId,
        title: title || 'New Counseling Session',
      },
    });

    const memory = await this.prisma.aIMemory.create({
      data: {
        conversationId: conversation.id,
        contextState: {},
        studentDecisions: {},
        followUpTopics: [],
      },
    });

    return { ...conversation, memory };
  }

  async getConversationContext(conversationId: string) {
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        memory: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async addMessage(
    conversationId: string,
    role: AIMessageRole,
    content: string,
  ) {
    return this.prisma.aIMessage.create({
      data: {
        conversationId,
        role,
        content,
      },
    });
  }

  async updateMemoryState(
    conversationId: string,
    updates: {
      contextState?: Prisma.InputJsonValue;
      studentDecisions?: Prisma.InputJsonValue;
      followUpTopics?: string[];
    },
  ) {
    const memory = await this.prisma.aIMemory.findUnique({
      where: { conversationId },
    });

    if (!memory) {
      throw new NotFoundException('Memory not found for this conversation');
    }

    // Merge existing JSON objects with new updates
    const currentContext = (memory.contextState as Record<string, any>) || {};
    const currentDecisions =
      (memory.studentDecisions as Record<string, any>) || {};

    const newContext = updates.contextState
      ? { ...currentContext, ...(updates.contextState as object) }
      : currentContext;

    const newDecisions = updates.studentDecisions
      ? { ...currentDecisions, ...(updates.studentDecisions as object) }
      : currentDecisions;

    // Follow-up topics could be completely replaced or appended (we'll just replace for now)
    const newTopics = updates.followUpTopics || memory.followUpTopics;

    return this.prisma.aIMemory.update({
      where: { conversationId },
      data: {
        contextState: newContext,
        studentDecisions: newDecisions,
        followUpTopics: newTopics,
      },
    });
  }

  async getUserConversations(userId: string) {
    return this.prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        memory: true,
      },
    });
  }
}
