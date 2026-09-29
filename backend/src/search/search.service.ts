import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CourseCategory } from '@prisma/client';

export interface SearchSuggestionItem {
  id: string;
  title: string;
  subtitle?: string;
  type:
    | 'college'
    | 'course'
    | 'study_material'
    | 'guide'
    | 'exam'
    | 'scholarship'
    | 'stream'
    | 'blog'
    | 'report'
    | 'location';
  slug?: string;
  badge?: string;
  url: string;
  meta?: any;
}

export interface TrendingSearchItem {
  text: string;
  count: number;
  type: string;
  url: string;
}

export interface TrendingContentResponse {
  searches: TrendingSearchItem[];
  colleges: SearchSuggestionItem[];
  courses: SearchSuggestionItem[];
  studyMaterials: SearchSuggestionItem[];
  guides: SearchSuggestionItem[];
  exams: SearchSuggestionItem[];
  scholarships: SearchSuggestionItem[];
  streams: string[];
  blogs: SearchSuggestionItem[];
  reports: SearchSuggestionItem[];
}

// Known common educational streams to ensure matching coverage
const KNOWN_STREAMS = [
  'Engineering',
  'Medical',
  'Management',
  'Commerce',
  'Science',
  'Law',
  'Arts & Humanities',
  'Design',
  'Pharmacy',
  'Architecture',
  'Computer Applications',
  'Agriculture',
  'Dental',
  'Nursing',
  'Hospitality & Tourism',
  'Mass Communication',
];

function scoreRelevance(title: string, kw: string, bonus: number = 0): number {
  const t = (title || '').toLowerCase().trim();
  const q = kw.toLowerCase().trim();
  if (!t || !q) return 0;
  let score = bonus;
  if (t === q) score += 100;
  else if (t.startsWith(q)) score += 60;
  else if (t.includes(' ' + q) || t.includes(q + ' ')) score += 40;
  else if (t.includes(q)) score += 25;
  return score;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────────────────────────────────────────────────────────
  // RECORD REAL SEARCH QUERY (Case-insensitive normalization, count increment)
  // ───────────────────────────────────────────────────────────────────────────
  async recordSearchQuery(rawQuery: string): Promise<void> {
    const trimmed = rawQuery.trim();
    if (trimmed.length < 2) return;
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');

    try {
      await this.prisma.searchQuery.upsert({
        where: { normalizedQuery: normalized },
        update: {
          searchCount: { increment: 1 },
          lastSearchedAt: new Date(),
          query: trimmed,
        },
        create: {
          query: trimmed,
          normalizedQuery: normalized,
          searchCount: 1,
          lastSearchedAt: new Date(),
        },
      });
    } catch {
      // Non-fatal if logging fails
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. FULL MULTI-ENTITY SEARCH (Used by /search results page & admin)
  // ───────────────────────────────────────────────────────────────────────────
  async search(keyword: string, type: string = 'ALL', limit: number = 20) {
    const trimmed = keyword.trim();
    const searchFilter = {
      contains: trimmed,
      mode: 'insensitive' as const,
    };

    // Track search query asynchronously
    this.recordSearchQuery(trimmed).catch(() => {});

    const upperType = (type || 'ALL').toUpperCase();
    const takeCount = Math.max(1, Math.min(limit || 20, 50));

    // Matching course category enums
    const matchingCategories = (Object.values(CourseCategory) as CourseCategory[]).filter((cat) =>
      cat.toLowerCase().includes(trimmed.toLowerCase()),
    );

    const promises: Promise<{ type: string; data: any[] }>[] = [];

    // 1. COLLEGES
    if (upperType === 'ALL' || upperType === 'COLLEGES' || upperType === 'COLLEGE' || upperType === 'PUBLIC') {
      promises.push(
        this.prisma.college
          .findMany({
            where: {
              status: { not: 'ARCHIVED' },
              OR: [
                { name: searchFilter },
                { city: searchFilter },
                { state: searchFilter },
                { university: searchFilter },
              ],
            },
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              slug: true,
              ownership: true,
              ranking: true,
              nirfRanking: true,
              featured: true,
              logo: true,
              banner: true,
            },
            take: takeCount * 2,
          })
          .then((res) => {
            const ranked = res
              .map((c) => ({
                item: c,
                score: scoreRelevance(c.name, trimmed, (c.featured ? 10 : 0) + (c.nirfRanking ? 5 : 0)),
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, takeCount)
              .map((r) => r.item);
            return { type: 'colleges', data: ranked };
          }),
      );
    }

    // 2. COURSES
    if (upperType === 'ALL' || upperType === 'COURSES' || upperType === 'COURSE' || upperType === 'PUBLIC') {
      const courseOrConditions: any[] = [
        { name: searchFilter },
        { eligibleStreams: { has: trimmed } },
        { description: searchFilter },
      ];
      if (matchingCategories.length > 0) {
        courseOrConditions.push({ category: { in: matchingCategories } });
      }

      promises.push(
        this.prisma.course
          .findMany({
            where: {
              status: { not: 'ARCHIVED' },
              OR: courseOrConditions,
            },
            include: {
              college: { select: { id: true, name: true, city: true, state: true, slug: true } },
            },
            take: takeCount * 2,
          })
          .then((res) => {
            const ranked = res
              .map((co) => ({
                item: co,
                score: scoreRelevance(co.name, trimmed, co.featured ? 8 : 0),
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, takeCount)
              .map((r) => r.item);
            return { type: 'courses', data: ranked };
          }),
      );
    }

    // 3. STUDY MATERIALS
    if (upperType === 'ALL' || upperType === 'MATERIALS' || upperType === 'STUDY_MATERIAL' || upperType === 'PUBLIC') {
      promises.push(
        this.prisma.studyMaterial
          .findMany({
            where: {
              status: 'PUBLISHED',
              OR: [
                { title: searchFilter },
                { subject: searchFilter },
                { materialType: searchFilter },
                { category: searchFilter },
                { stream: searchFilter },
              ],
            },
            select: {
              id: true,
              title: true,
              slug: true,
              materialType: true,
              category: true,
              stream: true,
              subject: true,
              thumbnail: true,
              pages: true,
              fileSize: true,
              downloadCount: true,
              premium: true,
              price: true,
              featured: true,
            },
            take: takeCount * 2,
          })
          .then((res) => {
            const ranked = res
              .map((m) => ({
                item: m,
                score: scoreRelevance(m.title, trimmed, (m.featured ? 6 : 0) + Math.min(m.downloadCount || 0, 15)),
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, takeCount)
              .map((r) => r.item);
            return { type: 'studyMaterials', data: ranked };
          }),
      );
    }

    // 4. CAREER & ADMISSION GUIDES
    if (upperType === 'ALL' || upperType === 'GUIDES' || upperType === 'GUIDE' || upperType === 'PUBLIC') {
      promises.push(
        Promise.all([
          // Blogs that are Guides
          this.prisma.blog.findMany({
            where: {
              status: 'PUBLISHED',
              deletedAt: null,
              OR: [
                { category: { contains: 'Guide', mode: 'insensitive' } },
                { category: { contains: 'Admission', mode: 'insensitive' } },
                { category: { contains: 'Career', mode: 'insensitive' } },
                { career: { not: null } },
              ],
              AND: [
                {
                  OR: [
                    { title: searchFilter },
                    { category: searchFilter },
                    { career: searchFilter },
                    { excerpt: searchFilter },
                  ],
                },
              ],
            },
            select: {
              id: true,
              title: true,
              slug: true,
              category: true,
              career: true,
              readingTime: true,
              thumbnail: true,
              featuredImage: true,
              updatedAt: true,
              featured: true,
            },
            take: takeCount,
          }),
          // Careers pathways
          this.prisma.career.findMany({
            where: {
              OR: [
                { careerName: searchFilter },
                { stream: searchFilter },
                { skills: { has: trimmed } },
                { industries: { has: trimmed } },
              ],
            },
            select: {
              id: true,
              careerName: true,
              slug: true,
              stream: true,
              requiredQualification: true,
              averageSalary: true,
              growthRate: true,
            },
            take: takeCount,
          }),
        ]).then(([guideBlogs, careers]) => {
          const formattedCareers = careers.map((c) => ({
            id: c.id,
            title: `${c.careerName} Career Pathway`,
            slug: c.slug || c.id,
            category: 'Career Guide',
            career: c.careerName,
            readingTime: 4,
            isCareer: true,
            meta: c,
          }));

          const combined = [...guideBlogs, ...formattedCareers];
          const ranked = combined
            .map((g) => ({
              item: g,
              score: scoreRelevance(g.title, trimmed, (g as any).featured ? 5 : 0),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, takeCount)
            .map((r) => r.item);

          return { type: 'guides', data: ranked };
        }),
      );
    }

    // 5. EXAMS
    if (upperType === 'ALL' || upperType === 'EXAMS' || upperType === 'EXAM' || upperType === 'PUBLIC') {
      promises.push(
        this.prisma.exam
          .findMany({
            where: {
              status: { not: 'ARCHIVED' },
              OR: [
                { examName: searchFilter },
                { category: searchFilter },
                { level: searchFilter },
              ],
            },
            select: {
              id: true,
              examName: true,
              slug: true,
              category: true,
              level: true,
              examMode: true,
              applicationEnd: true,
              examDate: true,
              featured: true,
            },
            take: takeCount * 2,
          })
          .then((res) => {
            const ranked = res
              .map((e) => ({
                item: e,
                score: scoreRelevance(e.examName, trimmed, e.featured ? 6 : 0),
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, takeCount)
              .map((r) => r.item);
            return { type: 'exams', data: ranked };
          }),
      );
    }

    // 6. SCHOLARSHIPS
    if (upperType === 'ALL' || upperType === 'SCHOLARSHIPS' || upperType === 'SCHOLARSHIP' || upperType === 'PUBLIC') {
      promises.push(
        this.prisma.scholarship
          .findMany({
            where: {
              status: { not: 'ARCHIVED' },
              OR: [
                { scholarshipName: searchFilter },
                { provider: searchFilter },
                { category: searchFilter },
              ],
            },
            select: {
              id: true,
              scholarshipName: true,
              provider: true,
              category: true,
              slug: true,
              amount: true,
              applicationEnd: true,
              featured: true,
            },
            take: takeCount * 2,
          })
          .then((res) => {
            const ranked = res
              .map((s) => ({
                item: s,
                score: scoreRelevance(s.scholarshipName, trimmed, s.featured ? 6 : 0),
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, takeCount)
              .map((r) => r.item);
            return { type: 'scholarships', data: ranked };
          }),
      );
    }

    // 7. STREAMS
    if (upperType === 'ALL' || upperType === 'STREAMS' || upperType === 'STREAM' || upperType === 'PUBLIC') {
      promises.push(
        Promise.all([
          this.prisma.course.findMany({
            where: { status: { not: 'ARCHIVED' } },
            select: { category: true },
            distinct: ['category'],
            take: 20,
          }),
          this.prisma.career.findMany({
            where: { stream: searchFilter },
            select: { stream: true },
            distinct: ['stream'],
            take: 6,
          }),
        ]).then(([courseCats, careerStreams]) => {
          const streamSet = new Set<string>();
          courseCats.forEach((c) => {
            if (c.category && c.category.toLowerCase().includes(trimmed.toLowerCase())) {
              streamSet.add(c.category.replace(/_/g, ' '));
            }
          });
          careerStreams.forEach((c) => {
            if (c.stream) streamSet.add(c.stream);
          });

          // Check known streams for keyword match
          KNOWN_STREAMS.forEach((ks) => {
            if (ks.toLowerCase().includes(trimmed.toLowerCase())) {
              streamSet.add(ks);
            }
          });

          const streamItems = Array.from(streamSet)
            .map((stream) => ({
              id: `stream-${stream.toLowerCase().replace(/\s+/g, '-')}`,
              name: stream,
              title: stream,
              type: 'Stream',
              url: `/courses?category=${encodeURIComponent(stream)}`,
            }))
            .slice(0, takeCount);

          return { type: 'streams', data: streamItems };
        }),
      );
    }

    // 8. BLOGS (Articles, News & Editorial)
    if (upperType === 'ALL' || upperType === 'BLOGS' || upperType === 'BLOG' || upperType === 'PUBLIC') {
      promises.push(
        this.prisma.blog
          .findMany({
            where: {
              status: 'PUBLISHED',
              deletedAt: null,
              OR: [
                { title: searchFilter },
                { category: searchFilter },
                { tags: { has: trimmed } },
                { excerpt: searchFilter },
              ],
            },
            select: {
              id: true,
              title: true,
              slug: true,
              category: true,
              thumbnail: true,
              readingTime: true,
              updatedAt: true,
              featured: true,
            },
            take: takeCount * 2,
          })
          .then((res) => {
            const ranked = res
              .map((b) => ({
                item: b,
                score: scoreRelevance(b.title, trimmed, b.featured ? 6 : 0),
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, takeCount)
              .map((r) => r.item);
            return { type: 'blogs', data: ranked };
          }),
      );
    }

    // 9. RESEARCH REPORTS (Annual Ranking & Empirical Research Reports)
    if (upperType === 'ALL' || upperType === 'REPORTS' || upperType === 'REPORT' || upperType === 'PUBLIC') {
      promises.push(
        Promise.all([
          this.prisma.rankingAnnualReport.findMany({
            where: {
              status: { not: 'ARCHIVED' },
              OR: [
                { title: searchFilter },
                { executiveSummary: searchFilter },
              ],
            },
            select: {
              id: true,
              rankingYear: true,
              title: true,
              status: true,
              executiveSummary: true,
              reportVersion: true,
              publishedAt: true,
            },
            take: takeCount,
          }),
          this.prisma.blog.findMany({
            where: {
              status: 'PUBLISHED',
              deletedAt: null,
              category: { contains: 'Report', mode: 'insensitive' },
              OR: [{ title: searchFilter }, { excerpt: searchFilter }],
            },
            select: {
              id: true,
              title: true,
              slug: true,
              category: true,
              updatedAt: true,
            },
            take: takeCount,
          }),
        ]).then(([annualReports, reportBlogs]) => {
          const formattedAnnual = annualReports.map((r) => ({
            id: r.id,
            title: r.title,
            year: r.rankingYear,
            status: r.status,
            summary: r.executiveSummary,
            type: 'Annual Research Report',
            url: `/rankings?year=${r.rankingYear}`,
          }));

          const formattedBlogs = reportBlogs.map((b) => ({
            id: b.id,
            title: b.title,
            slug: b.slug,
            type: 'Research Article',
            url: `/blog/${b.slug || b.id}`,
          }));

          const combined = [...formattedAnnual, ...formattedBlogs];
          const ranked = combined
            .map((item) => ({
              item,
              score: scoreRelevance(item.title, trimmed, 10),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, takeCount)
            .map((r) => r.item);

          return { type: 'reports', data: ranked };
        }),
      );
    }

    // 10. LOCATIONS (States & Cities)
    if (upperType === 'ALL' || upperType === 'LOCATIONS' || upperType === 'LOCATION' || upperType === 'PUBLIC') {
      promises.push(
        Promise.all([
          this.prisma.state.findMany({
            where: { status: 'ACTIVE', name: searchFilter },
            select: { id: true, name: true, code: true },
            take: 5,
          }),
          this.prisma.college.findMany({
            where: {
              status: { not: 'ARCHIVED' },
              city: searchFilter,
            },
            select: { city: true, state: true },
            distinct: ['city'],
            take: 5,
          }),
        ]).then(([states, cities]) => ({
          type: 'locations',
          data: [
            ...states.map((s) => ({ id: s.id, name: s.name, type: 'State', code: s.code })),
            ...cities.map((c, i) => ({ id: `city-${i}`, name: c.city, state: c.state, type: 'City' })),
          ],
        })),
      );
    }

    // ADMIN ENTITIES: Students, Leads, Applications, Counselors (for Admin Search Header)
    if (upperType === 'ADMIN' || upperType === 'ALL') {
      promises.push(
        // Students
        this.prisma.user
          .findMany({
            where: {
              role: 'STUDENT',
              OR: [{ fullName: searchFilter }, { email: searchFilter }, { mobile: searchFilter }],
            },
            select: { id: true, fullName: true, email: true, mobile: true },
            take: 5,
          })
          .then((res) => ({ type: 'students', data: res })),
        // Leads
        this.prisma.lead
          .findMany({
            where: {
              OR: [{ fullName: searchFilter }, { email: searchFilter }, { mobile: searchFilter }],
            },
            select: { id: true, fullName: true, mobile: true, status: true, preferredCourse: true },
            take: 5,
          })
          .then((res) => ({ type: 'leads', data: res })),
        // Applications
        this.prisma.application
          .findMany({
            where: {
              OR: [
                { applicationNumber: searchFilter },
                { user: { fullName: searchFilter } },
                { course: { name: searchFilter } },
              ],
            },
            select: {
              id: true,
              applicationNumber: true,
              status: true,
              user: { select: { fullName: true } },
              course: { select: { name: true } },
            },
            take: 5,
          })
          .then((res) => ({ type: 'applications', data: res })),
        // Counselors
        this.prisma.user
          .findMany({
            where: {
              role: { in: ['COUNSELOR', 'ADMIN', 'SUPER_ADMIN'] },
              OR: [{ fullName: searchFilter }, { email: searchFilter }],
            },
            select: { id: true, fullName: true, email: true, role: true },
            take: 5,
          })
          .then((res) => ({ type: 'counselors', data: res })),
      );
    }

    const results = await Promise.all(promises);

    return results.reduce(
      (acc, curr) => {
        acc[curr.type] = curr.data;
        return acc;
      },
      {} as Record<string, any[]>,
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. GOOGLE-STYLE INSTANT SEARCH SUGGESTIONS (Categorized & Unified)
  // ───────────────────────────────────────────────────────────────────────────
  async getSuggestions(keyword: string) {
    const trimmed = keyword.trim();
    if (!trimmed) {
      return {
        all: [],
        colleges: [],
        courses: [],
        studyMaterials: [],
        guides: [],
        exams: [],
        scholarships: [],
        streams: [],
        blogs: [],
        reports: [],
        locations: [],
      };
    }

    const searchFilter = {
      contains: trimmed,
      mode: 'insensitive' as const,
    };

    const matchingCategories = (Object.values(CourseCategory) as CourseCategory[]).filter((cat) =>
      cat.toLowerCase().includes(trimmed.toLowerCase()),
    );

    const courseOrConditions: any[] = [
      { name: searchFilter },
      { eligibleStreams: { has: trimmed } },
    ];
    if (matchingCategories.length > 0) {
      courseOrConditions.push({ category: { in: matchingCategories } });
    }

    // Query live entities concurrently
    const [
      colleges,
      courses,
      studyMaterials,
      guideBlogs,
      careers,
      exams,
      scholarships,
      states,
      cities,
      blogs,
      annualReports,
    ] = await Promise.all([
      // Colleges
      this.prisma.college.findMany({
        where: {
          status: { not: 'ARCHIVED' },
          OR: [
            { name: searchFilter },
            { city: searchFilter },
            { state: searchFilter },
            { university: searchFilter },
          ],
        },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          slug: true,
          nirfRanking: true,
          ranking: true,
          ownership: true,
          logo: true,
          featured: true,
        },
        take: 6,
      }),

      // Courses
      this.prisma.course.findMany({
        where: {
          status: { not: 'ARCHIVED' },
          OR: courseOrConditions,
        },
        include: {
          college: { select: { name: true, city: true } },
        },
        take: 6,
      }),

      // Study Materials
      this.prisma.studyMaterial.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { title: searchFilter },
            { subject: searchFilter },
            { materialType: searchFilter },
            { category: searchFilter },
            { stream: searchFilter },
          ],
        },
        select: {
          id: true,
          title: true,
          subject: true,
          category: true,
          stream: true,
          materialType: true,
          thumbnail: true,
          slug: true,
          pages: true,
          premium: true,
          price: true,
          downloadCount: true,
        },
        take: 5,
      }),

      // Career & Admission Guide Blogs
      this.prisma.blog.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          OR: [
            { category: { contains: 'Guide', mode: 'insensitive' } },
            { category: { contains: 'Admission', mode: 'insensitive' } },
            { category: { contains: 'Career', mode: 'insensitive' } },
            { career: { not: null } },
          ],
          AND: [
            {
              OR: [{ title: searchFilter }, { category: searchFilter }, { career: searchFilter }],
            },
          ],
        },
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          career: true,
          readingTime: true,
        },
        take: 4,
      }),

      // Careers
      this.prisma.career.findMany({
        where: {
          OR: [{ careerName: searchFilter }, { stream: searchFilter }],
        },
        select: {
          id: true,
          careerName: true,
          slug: true,
          stream: true,
        },
        take: 3,
      }),

      // Exams
      this.prisma.exam.findMany({
        where: {
          status: { not: 'ARCHIVED' },
          OR: [{ examName: searchFilter }, { category: searchFilter }],
        },
        select: {
          id: true,
          examName: true,
          slug: true,
          category: true,
          examMode: true,
        },
        take: 4,
      }),

      // Scholarships
      this.prisma.scholarship.findMany({
        where: {
          status: { not: 'ARCHIVED' },
          OR: [
            { scholarshipName: searchFilter },
            { provider: searchFilter },
            { category: searchFilter },
          ],
        },
        select: {
          id: true,
          scholarshipName: true,
          provider: true,
          category: true,
          slug: true,
          amount: true,
        },
        take: 4,
      }),

      // States
      this.prisma.state.findMany({
        where: {
          status: 'ACTIVE',
          name: searchFilter,
        },
        select: { id: true, name: true, code: true },
        take: 2,
      }),

      // Cities
      this.prisma.college.findMany({
        where: {
          status: { not: 'ARCHIVED' },
          city: searchFilter,
        },
        select: { city: true, state: true },
        distinct: ['city'],
        take: 3,
      }),

      // Blogs
      this.prisma.blog.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          OR: [{ title: searchFilter }, { category: searchFilter }],
        },
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          readingTime: true,
        },
        take: 4,
      }),

      // Reports
      this.prisma.rankingAnnualReport.findMany({
        where: {
          status: { not: 'ARCHIVED' },
          title: searchFilter,
        },
        select: {
          id: true,
          title: true,
          rankingYear: true,
        },
        take: 2,
      }),
    ]);

    // Format & Rank Colleges
    const collegeItems: SearchSuggestionItem[] = colleges
      .map((c) => ({
        item: {
          id: c.id,
          title: c.name,
          subtitle: `${c.city ? `${c.city}, ` : ''}${c.state || 'India'}${c.nirfRanking ? ` · NIRF #${c.nirfRanking}` : ''}`,
          type: 'college' as const,
          slug: c.slug || c.id,
          badge: c.ownership || 'College',
          url: `/colleges/${c.slug || c.id}`,
          meta: c,
        },
        score: scoreRelevance(c.name, trimmed, (c.featured ? 10 : 0) + (c.nirfRanking ? 5 : 0)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((r) => r.item);

    // Format & Rank Courses
    const courseItems: SearchSuggestionItem[] = courses
      .map((co) => ({
        item: {
          id: co.id,
          title: co.name,
          subtitle: co.college?.name ? `Offered by ${co.college.name}` : (co.category || 'Academic Course'),
          type: 'course' as const,
          slug: co.slug || co.id,
          badge: co.category || 'Course',
          url: `/courses?q=${encodeURIComponent(co.name)}`,
          meta: co,
        },
        score: scoreRelevance(co.name, trimmed, co.featured ? 6 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((r) => r.item);

    // Format & Rank Study Materials
    const materialItems: SearchSuggestionItem[] = studyMaterials
      .map((m) => ({
        item: {
          id: m.id,
          title: m.title,
          subtitle: `${m.materialType || 'Notes'} · ${m.subject || m.category || 'General'}${m.pages ? ` · ${m.pages} pgs` : ''}`,
          type: 'study_material' as const,
          slug: m.slug || m.id,
          badge: m.premium ? `₹${m.price || 0}` : 'FREE',
          url: `/study-materials?q=${encodeURIComponent(m.title)}`,
          meta: m,
        },
        score: scoreRelevance(m.title, trimmed, Math.min(m.downloadCount || 0, 10)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((r) => r.item);

    // Format Guides & Careers
    const guideItems: SearchSuggestionItem[] = [
      ...guideBlogs.map((g) => ({
        id: g.id,
        title: g.title,
        subtitle: `${g.career || 'Career Guidance'} · ${g.category || 'Education'}`,
        type: 'guide' as const,
        slug: g.slug || g.id,
        badge: g.readingTime ? `${g.readingTime} min read` : 'Guide',
        url: `/blog/${g.slug || g.id}`,
        meta: g,
      })),
      ...careers.map((c) => ({
        id: c.id,
        title: `${c.careerName} Career Guide`,
        subtitle: `Explore opportunities in ${c.stream}`,
        type: 'guide' as const,
        slug: c.slug || c.id,
        badge: 'Career',
        url: `/courses?category=${encodeURIComponent(c.stream)}`,
        meta: c,
      })),
    ].slice(0, 4);

    // Format Exams
    const examItems: SearchSuggestionItem[] = exams.map((e) => ({
      id: e.id,
      title: e.examName,
      subtitle: `${e.category || 'Entrance Exam'}${e.examMode ? ` · ${e.examMode}` : ''}`,
      type: 'exam' as const,
      slug: e.slug || e.id,
      badge: 'Exam',
      url: `/exams/${e.slug || e.id}`,
      meta: e,
    }));

    // Format Scholarships
    const scholarshipItems: SearchSuggestionItem[] = scholarships.map((s) => ({
      id: s.id,
      title: s.scholarshipName,
      subtitle: `Provider: ${s.provider || 'Verified Scheme'}${s.amount ? ` · Up to ₹${s.amount}` : ''}`,
      type: 'scholarship' as const,
      slug: s.slug || s.id,
      badge: 'Scholarship',
      url: `/scholarships/${s.slug || s.id}`,
      meta: s,
    }));

    // Format Streams matching keyword
    const streamItems: SearchSuggestionItem[] = KNOWN_STREAMS
      .filter((stream) => stream.toLowerCase().includes(trimmed.toLowerCase()))
      .slice(0, 3)
      .map((stream) => ({
        id: `stream-${stream.toLowerCase().replace(/\s+/g, '-')}`,
        title: stream,
        subtitle: `Explore ${stream} courses and colleges`,
        type: 'stream' as const,
        badge: 'Stream',
        url: `/courses?category=${encodeURIComponent(stream)}`,
      }));

    // Format Blogs
    const blogItems: SearchSuggestionItem[] = blogs.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: `${b.category || 'Blog'}${b.readingTime ? ` · ${b.readingTime} min read` : ''}`,
      type: 'blog' as const,
      slug: b.slug || b.id,
      badge: 'Blog',
      url: `/blog/${b.slug || b.id}`,
      meta: b,
    }));

    // Format Reports
    const reportItems: SearchSuggestionItem[] = annualReports.map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: `Official Research Report ${r.rankingYear}`,
      type: 'report' as const,
      badge: 'Report',
      url: `/rankings?year=${r.rankingYear}`,
    }));

    // Format Locations
    const locationItems: SearchSuggestionItem[] = [
      ...states.map((st) => ({
        id: st.id,
        title: st.name,
        subtitle: `Explore colleges in ${st.name}`,
        type: 'location' as const,
        badge: 'State',
        url: `/colleges?state=${encodeURIComponent(st.name)}`,
      })),
      ...cities.map((ci, idx) => ({
        id: `city-${idx}`,
        title: ci.city,
        subtitle: `Colleges in ${ci.city}, ${ci.state}`,
        type: 'location' as const,
        badge: 'City',
        url: `/colleges?city=${encodeURIComponent(ci.city)}`,
      })),
    ];

    // Combine into flat unified list for keyboard navigation
    const all: SearchSuggestionItem[] = [
      ...collegeItems,
      ...courseItems,
      ...materialItems,
      ...guideItems,
      ...examItems,
      ...scholarshipItems,
      ...streamItems,
      ...blogItems,
      ...reportItems,
      ...locationItems,
    ];

    return {
      all,
      colleges: collegeItems,
      courses: courseItems,
      studyMaterials: materialItems,
      guides: guideItems,
      exams: examItems,
      scholarships: scholarshipItems,
      streams: streamItems,
      blogs: blogItems,
      reports: reportItems,
      locations: locationItems,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. REAL DATABASE TRENDING CONTENT (Live SearchQuery tracking + Entities)
  // ───────────────────────────────────────────────────────────────────────────
  async getTrendingContent(): Promise<TrendingContentResponse> {
    const [realQueries, colleges, courses, studyMaterials, guides, exams, scholarships, blogs, annualReports] =
      await Promise.all([
        // Top recorded searches from real user activity
        this.prisma.searchQuery.findMany({
          orderBy: [{ searchCount: 'desc' }, { lastSearchedAt: 'desc' }],
          take: 8,
        }),

        // Top Trending Colleges
        this.prisma.college.findMany({
          where: { status: { not: 'ARCHIVED' } },
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            slug: true,
            nirfRanking: true,
            ranking: true,
            ownership: true,
            featured: true,
            logo: true,
          },
          take: 4,
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        }),

        // Top Trending Courses
        this.prisma.course.findMany({
          where: { status: { not: 'ARCHIVED' } },
          include: {
            college: { select: { name: true, city: true } },
          },
          take: 4,
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        }),

        // Top Trending Study Materials
        this.prisma.studyMaterial.findMany({
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            title: true,
            subject: true,
            category: true,
            stream: true,
            materialType: true,
            thumbnail: true,
            slug: true,
            downloadCount: true,
            premium: true,
            price: true,
          },
          take: 4,
          orderBy: [{ featured: 'desc' }, { downloadCount: 'desc' }],
        }),

        // Top Trending Guides
        this.prisma.blog.findMany({
          where: {
            status: 'PUBLISHED',
            deletedAt: null,
            OR: [
              { category: { contains: 'Guide', mode: 'insensitive' } },
              { career: { not: null } },
            ],
          },
          select: {
            id: true,
            title: true,
            slug: true,
            category: true,
            career: true,
            readingTime: true,
          },
          take: 4,
          orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
        }),

        // Top Trending Exams
        this.prisma.exam.findMany({
          where: { status: { not: 'ARCHIVED' } },
          select: {
            id: true,
            examName: true,
            slug: true,
            category: true,
            examMode: true,
          },
          take: 3,
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        }),

        // Top Trending Scholarships
        this.prisma.scholarship.findMany({
          where: { status: { not: 'ARCHIVED' } },
          select: {
            id: true,
            scholarshipName: true,
            provider: true,
            category: true,
            slug: true,
            amount: true,
          },
          take: 3,
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        }),

        // Top Trending Blogs
        this.prisma.blog.findMany({
          where: { status: 'PUBLISHED', deletedAt: null },
          select: {
            id: true,
            title: true,
            slug: true,
            category: true,
            readingTime: true,
          },
          take: 3,
          orderBy: [{ views: 'desc' }, { updatedAt: 'desc' }],
        }),

        // Top Research Reports
        this.prisma.rankingAnnualReport.findMany({
          where: { status: { not: 'ARCHIVED' } },
          select: {
            id: true,
            title: true,
            rankingYear: true,
          },
          take: 2,
          orderBy: { rankingYear: 'desc' },
        }),
      ]);

    // Format real trending searches
    const searches: TrendingSearchItem[] = [];

    // Prioritize queries recorded from real user activity
    realQueries.forEach((rq) => {
      searches.push({
        text: rq.query,
        count: rq.searchCount,
        type: 'query',
        url: `/search?q=${encodeURIComponent(rq.query)}`,
      });
    });

    // If there are few recorded queries, supplement with top verified colleges & courses
    if (searches.length < 5) {
      colleges.slice(0, 2).forEach((c) => {
        if (!searches.some((s) => s.text.toLowerCase() === c.name.toLowerCase())) {
          searches.push({
            text: c.name,
            count: 1,
            type: 'college',
            url: `/colleges/${c.slug || c.id}`,
          });
        }
      });
      courses.slice(0, 2).forEach((co) => {
        if (!searches.some((s) => s.text.toLowerCase() === co.name.toLowerCase())) {
          searches.push({
            text: co.name,
            count: 1,
            type: 'course',
            url: `/courses?q=${encodeURIComponent(co.name)}`,
          });
        }
      });
      studyMaterials.slice(0, 1).forEach((sm) => {
        if (!searches.some((s) => s.text.toLowerCase() === sm.title.toLowerCase())) {
          searches.push({
            text: sm.title,
            count: 1,
            type: 'study_material',
            url: `/study-materials?q=${encodeURIComponent(sm.title)}`,
          });
        }
      });
    }

    // Dynamic Streams extracted from active courses & study materials
    const streamSet = new Set<string>();
    courses.forEach((c) => {
      if (c.category) streamSet.add(c.category.toString().replace(/_/g, ' '));
    });
    studyMaterials.forEach((m) => {
      if (m.stream) streamSet.add(m.stream);
      if (m.category) streamSet.add(m.category);
    });
    KNOWN_STREAMS.slice(0, 6).forEach((s) => streamSet.add(s));

    const streams = Array.from(streamSet).slice(0, 8);

    return {
      searches,
      colleges: colleges.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: `${c.city ? `${c.city}, ` : ''}${c.state || 'India'}${c.nirfRanking ? ` · NIRF #${c.nirfRanking}` : ''}`,
        type: 'college' as const,
        badge: c.ownership || 'College',
        url: `/colleges/${c.slug || c.id}`,
        meta: c,
      })),
      courses: courses.map((co) => ({
        id: co.id,
        title: co.name,
        subtitle: co.college?.name ? `Offered by ${co.college.name}` : (co.category || 'Course'),
        type: 'course' as const,
        badge: co.category || 'Course',
        url: `/courses?q=${encodeURIComponent(co.name)}`,
        meta: co,
      })),
      studyMaterials: studyMaterials.map((sm) => ({
        id: sm.id,
        title: sm.title,
        subtitle: `${sm.materialType || 'Notes'} · ${sm.subject || sm.category || 'General'}`,
        type: 'study_material' as const,
        badge: sm.premium ? `₹${sm.price || 0}` : 'FREE',
        url: `/study-materials?q=${encodeURIComponent(sm.title)}`,
        meta: sm,
      })),
      guides: guides.map((g) => ({
        id: g.id,
        title: g.title,
        subtitle: `${g.career || 'Career Guidance'} · ${g.category || 'Education'}`,
        type: 'guide' as const,
        badge: g.readingTime ? `${g.readingTime} min read` : 'Guide',
        url: `/blog/${g.slug || g.id}`,
        meta: g,
      })),
      exams: exams.map((e) => ({
        id: e.id,
        title: e.examName,
        subtitle: e.category || 'Entrance Exam',
        type: 'exam' as const,
        badge: 'Exam',
        url: `/exams/${e.slug || e.id}`,
        meta: e,
      })),
      scholarships: scholarships.map((s) => ({
        id: s.id,
        title: s.scholarshipName,
        subtitle: s.provider || 'Scholarship Opportunity',
        type: 'scholarship' as const,
        badge: 'Scholarship',
        url: `/scholarships/${s.slug || s.id}`,
        meta: s,
      })),
      streams,
      blogs: blogs.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: `${b.category || 'Blog'}${b.readingTime ? ` · ${b.readingTime} min read` : ''}`,
        type: 'blog' as const,
        badge: 'Blog',
        url: `/blog/${b.slug || b.id}`,
        meta: b,
      })),
      reports: annualReports.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: `National Ranking & Research Report ${r.rankingYear}`,
        type: 'report' as const,
        badge: 'Report',
        url: `/rankings?year=${r.rankingYear}`,
      })),
    };
  }

  async getTrendingSearches(): Promise<TrendingContentResponse> {
    return this.getTrendingContent();
  }
}
