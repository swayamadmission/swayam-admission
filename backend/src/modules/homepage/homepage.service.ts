import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type TickerCategory =
  | 'COLLEGE'
  | 'OFFER'
  | 'ANNOUNCEMENT'
  | 'COURSE'
  | 'EXAM'
  | 'SCHOLARSHIP'
  | 'STUDY_MATERIAL';

export interface AnnouncementTickerItem {
  id: string;
  category: TickerCategory;
  badge: string;
  text: string;
  buttonText: string;
  href: string;
  isExternal?: boolean;
}

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);
  private cache: { expiresAt: number; data: AnnouncementTickerItem[] } | null = null;
  private readonly CACHE_TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async getAnnouncements(): Promise<AnnouncementTickerItem[]> {
    const nowMs = Date.now();
    if (this.cache && this.cache.expiresAt > nowMs) {
      return this.cache.data;
    }

    const now = new Date();
    const items: AnnouncementTickerItem[] = [];

    const [
      collegesRes,
      couponsRes,
      bannersRes,
      blogsRes,
      coursesRes,
      examsRes,
      scholarshipsRes,
      materialsRes,
    ] = await Promise.allSettled([
      this.prisma.college.findMany({
        where: { status: { in: ['PUBLISHED', 'ACTIVE', 'VERIFIED'] } },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: 2,
        select: { id: true, slug: true, name: true, city: true, state: true },
      }),
      this.prisma.coupon.findMany({
        where: {
          isActive: true,
          isVisibleToStudents: true,
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: {
          id: true,
          code: true,
          discountType: true,
          discountValue: true,
          applicableScope: true,
        },
      }),
      this.prisma.banner.findMany({
        where: {
          isActive: true,
          status: 'ACTIVE',
          title: { not: null },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 2,
        select: {
          id: true,
          title: true,
          buttonText: true,
          buttonUrl: true,
          openInNewTab: true,
        },
      }),
      this.prisma.blog.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: 2,
        select: { id: true, title: true, slug: true },
      }),
      this.prisma.course.findMany({
        where: { status: { in: ['PUBLISHED', 'ACTIVE', 'VERIFIED'] } },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: 2,
        select: { id: true, name: true, duration: true },
      }),
      this.prisma.exam.findMany({
        where: { status: { in: ['PUBLISHED', 'ACTIVE'] } },
        orderBy: [{ featured: 'desc' }, { examDate: 'asc' }, { createdAt: 'desc' }],
        take: 2,
        select: { id: true, examName: true, slug: true, examDate: true },
      }),
      this.prisma.scholarship.findMany({
        where: { status: { in: ['PUBLISHED', 'ACTIVE'] } },
        orderBy: [{ featured: 'desc' }, { applicationEnd: 'asc' }, { createdAt: 'desc' }],
        take: 2,
        select: { id: true, scholarshipName: true, slug: true, amount: true },
      }),
      this.prisma.studyMaterial.findMany({
        where: { status: { in: ['PUBLISHED', 'ACTIVE'] } },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: 2,
        select: { id: true, title: true, materialType: true, premium: true, price: true },
      }),
    ]);

    // 1. College update
    const colleges = collegesRes.status === 'fulfilled' ? collegesRes.value : [];
    if (colleges.length > 0) {
      const c = colleges[0];
      items.push({
        id: `college-${c.id}`,
        category: 'COLLEGE',
        badge: 'College',
        text: `Admissions 2026 open at ${c.name}${c.city ? ` (${c.city})` : ''}`,
        buttonText: 'View College',
        href: `/colleges/${c.id}`,
      });
    } else {
      items.push({
        id: 'college-default',
        category: 'COLLEGE',
        badge: 'College',
        text: '500+ Verified Colleges open for 2026 Admissions across India',
        buttonText: 'Explore Colleges',
        href: '/colleges',
      });
    }

    // 2. Offer update
    const coupons = couponsRes.status === 'fulfilled' ? couponsRes.value : [];
    if (coupons.length > 0) {
      const cp = coupons[0];
      const discountLabel =
        cp.discountType === 'PERCENTAGE'
          ? `${Math.round(cp.discountValue)}% OFF`
          : `Rs.${Math.round(cp.discountValue)} OFF`;
      const href =
        cp.applicableScope === 'STUDY_MATERIAL_FEE' ? '/study-materials' : '/apply-now';
      items.push({
        id: `offer-${cp.id}`,
        category: 'OFFER',
        badge: 'Offer',
        text: `${discountLabel} with code ${cp.code} on fee & admission support`,
        buttonText: 'Claim Offer',
        href,
      });
    } else {
      items.push({
        id: 'offer-default',
        category: 'OFFER',
        badge: 'Offer',
        text: 'Free 1-on-1 Admission Counseling & Zero Platform Fee for Students',
        buttonText: 'Claim Free',
        href: '/apply-now',
      });
    }

    // 3. Announcement update
    const banners = bannersRes.status === 'fulfilled' ? bannersRes.value : [];
    const blogs = blogsRes.status === 'fulfilled' ? blogsRes.value : [];
    const validBanner = banners.find((b) => b.title && b.title.trim().length > 0);
    if (validBanner) {
      items.push({
        id: `announcement-${validBanner.id}`,
        category: 'ANNOUNCEMENT',
        badge: 'Announcement',
        text: validBanner.title!.trim(),
        buttonText: validBanner.buttonText?.trim() || 'View Update',
        href: validBanner.buttonUrl?.trim() || '/blogs',
        isExternal: Boolean(validBanner.openInNewTab || validBanner.buttonUrl?.startsWith('http')),
      });
    } else if (blogs.length > 0) {
      const bl = blogs[0];
      items.push({
        id: `announcement-${bl.id}`,
        category: 'ANNOUNCEMENT',
        badge: 'Announcement',
        text: bl.title,
        buttonText: 'Read Update',
        href: `/blog/${bl.slug}`,
      });
    } else {
      items.push({
        id: 'announcement-default',
        category: 'ANNOUNCEMENT',
        badge: 'Announcement',
        text: '2026 Admission Notices, Merit Cutoff Lists & Seat Alerts Live Now',
        buttonText: 'Read Alerts',
        href: '/blogs',
      });
    }

    // 4. Course update
    const courses = coursesRes.status === 'fulfilled' ? coursesRes.value : [];
    if (courses.length > 0) {
      const cr = courses[0];
      items.push({
        id: `course-${cr.id}`,
        category: 'COURSE',
        badge: 'Course',
        text: `${cr.name}${cr.duration ? ` (${cr.duration})` : ''} - Check Eligibility & Fees`,
        buttonText: 'Explore Course',
        href: '/courses',
      });
    } else {
      items.push({
        id: 'course-default',
        category: 'COURSE',
        badge: 'Course',
        text: 'B.Tech, MBA, BCA, MBBS & Diploma 2026 Seat Intake Updated',
        buttonText: 'Browse Courses',
        href: '/courses',
      });
    }

    // 5. Exam update
    const exams = examsRes.status === 'fulfilled' ? examsRes.value : [];
    if (exams.length > 0) {
      const ex = exams[0];
      items.push({
        id: `exam-${ex.id}`,
        category: 'EXAM',
        badge: 'Exam',
        text: `${ex.examName} — Syllabus, Exam Dates & Registration Details`,
        buttonText: 'Check Exam',
        href: `/exams/${ex.slug}`,
      });
    } else {
      items.push({
        id: 'exam-default',
        category: 'EXAM',
        badge: 'Exam',
        text: 'JEE Main, NEET, CUET & CAT 2026 Exam Dates & Notifications',
        buttonText: 'View Exams',
        href: '/exams',
      });
    }

    // 6. Scholarship update
    const scholarships = scholarshipsRes.status === 'fulfilled' ? scholarshipsRes.value : [];
    if (scholarships.length > 0) {
      const sc = scholarships[0];
      const amt = sc.amount ? ` (Up to Rs.${Math.round(sc.amount).toLocaleString('en-IN')})` : '';
      items.push({
        id: `scholarship-${sc.id}`,
        category: 'SCHOLARSHIP',
        badge: 'Scholarship',
        text: `${sc.scholarshipName}${amt} — Applications Open`,
        buttonText: 'Apply Now',
        href: `/scholarships/${sc.slug}`,
      });
    } else {
      items.push({
        id: 'scholarship-default',
        category: 'SCHOLARSHIP',
        badge: 'Scholarship',
        text: 'Merit & State Government Scholarships 2026 — Up to 100% Tuition Support',
        buttonText: 'Check Eligibility',
        href: '/scholarships',
      });
    }

    // 7. Study Material update
    const materials = materialsRes.status === 'fulfilled' ? materialsRes.value : [];
    if (materials.length > 0) {
      const sm = materials[0];
      items.push({
        id: `material-${sm.id}`,
        category: 'STUDY_MATERIAL',
        badge: 'Study Material',
        text: `${sm.title} (${sm.materialType || 'PDF Notes'}) Available`,
        buttonText: 'Get Material',
        href: `/study-materials?search=${encodeURIComponent(sm.title)}`,
      });
    } else {
      items.push({
        id: 'material-default',
        category: 'STUDY_MATERIAL',
        badge: 'Study Material',
        text: 'Free Previous Year Papers, Mock Tests & Chapter Notes Uploaded',
        buttonText: 'Download Notes',
        href: '/study-materials',
      });
    }

    this.cache = { expiresAt: nowMs + this.CACHE_TTL_MS, data: items };
    return items;
  }
}
