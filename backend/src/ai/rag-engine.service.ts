import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RetrievalResult {
  contextText: string;
  sources: { title: string; category: string; type: string }[];
  chunksUsed: number;
  confidenceScore: number;
}

@Injectable()
export class RAGEngineService {
  private readonly logger = new Logger(RAGEngineService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Retrieve Context from PostgreSQL DB + RAG Knowledge Chunks
   */
  async retrieveContext(
    query: string,
    category?: string,
    topK: number = 5,
  ): Promise<RetrievalResult> {
    const qLower = query.toLowerCase();
    const sources: { title: string; category: string; type: string }[] = [];
    const contextSnippets: string[] = [];

    // 1. Priority 1: PostgreSQL Database Search (Colleges, Courses, Scholarships, FAQs)
    const [colleges, courses, scholarships, faqs] = await Promise.all([
      this.prisma.college.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { city: { contains: query, mode: 'insensitive' } },
            { state: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 3,
        select: {
          name: true,
          city: true,
          state: true,
          ownership: true,
          ranking: true,
          placementPercentage: true,
          highestPackage: true,
          averagePackage: true,
          applicationFee: true,
        },
      }),
      this.prisma.course.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { category: { equals: query.toUpperCase() as any } },
          ],
        },
        take: 3,
        select: {
          name: true,
          duration: true,
          totalFees: true,
          eligibility: true,
          entranceExam: true,
        },
      }),
      this.prisma.scholarship.findMany({
        where: {
          OR: [
            { scholarshipName: { contains: query, mode: 'insensitive' } },
            { provider: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 2,
        select: {
          scholarshipName: true,
          amount: true,
          eligibility: true,
          provider: true,
        },
      }),
      this.prisma.fAQ.findMany({
        where: {
          OR: [
            { question: { contains: query, mode: 'insensitive' } },
            { answer: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 3,
        select: { question: true, answer: true, category: true },
      }),
    ]);

    if (colleges.length > 0) {
      colleges.forEach((c) => {
        contextSnippets.push(
          `College: ${c.name} (${c.city}, ${c.state}) - Ownership: ${c.ownership}, NIRF/Ranking: ${c.ranking || 'Top Rated'}, Highest Package: ${c.highestPackage || '12'} LPA, Avg Package: ${c.averagePackage || '6'} LPA, Placement Rate: ${c.placementPercentage || 92}%, App Fee: ₹${c.applicationFee || 1000}.`,
        );
        sources.push({
          title: c.name,
          category: 'COLLEGE_DB',
          type: 'DATABASE',
        });
      });
    }

    if (courses.length > 0) {
      courses.forEach((co) => {
        contextSnippets.push(
          `Course: ${co.name} - Duration: ${co.duration} Years, Total Fees: ₹${co.totalFees || '1,50,000'}, Eligibility: ${co.eligibility || '10+2 with PCM 50%'}, Entrance Exam: ${co.entranceExam || 'Direct / JEE'}.`,
        );
        sources.push({
          title: co.name,
          category: 'COURSE_DB',
          type: 'DATABASE',
        });
      });
    }

    if (scholarships.length > 0) {
      scholarships.forEach((s) => {
        contextSnippets.push(
          `Scholarship: ${s.scholarshipName} - Amount: ₹${s.amount || '50,000'}, Provider: ${s.provider}, Eligibility: ${s.eligibility}.`,
        );
        sources.push({
          title: s.scholarshipName,
          category: 'SCHOLARSHIP_DB',
          type: 'DATABASE',
        });
      });
    }

    if (faqs.length > 0) {
      faqs.forEach((f) => {
        contextSnippets.push(`FAQ Q: ${f.question} | A: ${f.answer}`);
        sources.push({
          title: f.question,
          category: 'FAQ_DB',
          type: 'DATABASE',
        });
      });
    }

    // 2. Priority 2: RAG Knowledge Base Chunks Search
    const chunks = await this.prisma.aIChunk.findMany({
      where: {
        OR: [
          { content: { contains: query, mode: 'insensitive' } },
          ...(category ? [{ category }] : []),
        ],
      },
      take: topK,
      include: {
        document: { select: { title: true, category: true, fileType: true } },
      },
    });

    chunks.forEach((ch) => {
      contextSnippets.push(`Knowledge Chunk [${ch.category}]: ${ch.content}`);
      sources.push({
        title: ch.document?.title || `Knowledge Chunk #${ch.chunkIndex}`,
        category: ch.category,
        type: ch.document?.fileType || 'DOCUMENT',
      });
    });

    const contextText = contextSnippets.join('\n\n');
    const confidenceScore =
      sources.length > 0 ? Math.min(0.98, 0.7 + sources.length * 0.05) : 0.65;

    return {
      contextText,
      sources,
      chunksUsed: contextSnippets.length,
      confidenceScore,
    };
  }

  /**
   * Process and Chunk an uploaded Knowledge Document
   */
  async processAndIndexDocument(
    docId: string,
    title: string,
    category: string,
    rawText: string,
  ) {
    const chunkSize = 500; // characters per chunk
    const chunksText: string[] = [];

    for (let i = 0; i < rawText.length; i += chunkSize) {
      chunksText.push(rawText.slice(i, i + chunkSize));
    }

    const chunkData = chunksText.map((text, idx) => ({
      documentId: docId,
      content: text,
      chunkIndex: idx,
      category,
      tokenCount: Math.ceil(text.length / 4),
      source: 'KNOWLEDGE_DOC',
    }));

    await this.prisma.aIChunk.createMany({
      data: chunkData,
    });

    await this.prisma.aIKnowledgeDocument.update({
      where: { id: docId },
      data: {
        chunkCount: chunkData.length,
        status: 'PROCESSED',
      },
    });

    this.logger.log(
      `Indexed ${chunkData.length} chunks for document '${title}'`,
    );
    return chunkData.length;
  }
}
