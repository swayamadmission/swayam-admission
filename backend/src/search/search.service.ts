import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(keyword: string, type: string = 'ALL') {
    const searchFilter = {
      contains: keyword,
      mode: 'insensitive' as const,
    };

    const promises: Promise<any>[] = [];

    // 1. Search Colleges
    if (type === 'ALL' || type === 'COLLEGE') {
      promises.push(
        this.prisma.college
          .findMany({
            where: {
              status: 'PUBLISHED',
              OR: [
                { name: searchFilter },
                { city: searchFilter },
                { state: searchFilter },
              ],
            },
            take: 10,
          })
          .then((res) => ({ type: 'colleges', data: res })),
      );
    }

    // 2. Search Courses
    if (type === 'ALL' || type === 'COURSE') {
      promises.push(
        this.prisma.course
          .findMany({
            where: {
              status: 'PUBLISHED',
              OR: [{ name: searchFilter }],
            },
            include: {
              college: { select: { name: true, city: true, state: true } },
            },
            take: 10,
          })
          .then((res) => ({ type: 'courses', data: res })),
      );
    }

    // 3. Search Students (Admin / Global)
    if (type === 'ALL' || type === 'STUDENT') {
      promises.push(
        this.prisma.user
          .findMany({
            where: {
              role: 'STUDENT',
              OR: [
                { fullName: searchFilter },
                { email: searchFilter },
                { mobile: searchFilter },
                { studentId: searchFilter },
                { registrationNumber: searchFilter },
              ],
            },
            select: {
              id: true,
              fullName: true,
              email: true,
              mobile: true,
              studentId: true,
              registrationNumber: true,
              status: true,
            },
            take: 10,
          })
          .then((res) => ({ type: 'students', data: res })),
      );
    }

    // 4. Search Leads
    if (type === 'ALL' || type === 'LEAD') {
      promises.push(
        this.prisma.lead
          .findMany({
            where: {
              isDeleted: false,
              OR: [
                { fullName: searchFilter },
                { email: searchFilter },
                { mobile: searchFilter },
                { id: searchFilter },
                { preferredCourse: searchFilter },
                { preferredCollege: searchFilter },
              ],
            },
            select: {
              id: true,
              fullName: true,
              email: true,
              mobile: true,
              status: true,
              priority: true,
              preferredCourse: true,
              preferredCollege: true,
            },
            take: 10,
          })
          .then((res) => ({ type: 'leads', data: res })),
      );
    }

    // 5. Search Applications
    if (type === 'ALL' || type === 'APPLICATION') {
      promises.push(
        this.prisma.application
          .findMany({
            where: {
              OR: [
                { id: searchFilter },
                { applicationId: searchFilter },
                { applicationNumber: searchFilter },
                { user: { fullName: searchFilter } },
                { college: { name: searchFilter } },
                { course: { name: searchFilter } },
              ],
            },
            select: {
              id: true,
              applicationId: true,
              applicationNumber: true,
              status: true,
              user: { select: { fullName: true, email: true, mobile: true } },
              college: { select: { name: true } },
              course: { select: { name: true } },
            },
            take: 10,
          })
          .then((res) => ({ type: 'applications', data: res })),
      );
    }

    // 6. Search Counselors
    if (type === 'ALL' || type === 'COUNSELOR') {
      promises.push(
        this.prisma.user
          .findMany({
            where: {
              role: 'COUNSELOR',
              OR: [
                { fullName: searchFilter },
                { email: searchFilter },
                { mobile: searchFilter },
              ],
            },
            select: {
              id: true,
              fullName: true,
              email: true,
              mobile: true,
              department: true,
              status: true,
            },
            take: 10,
          })
          .then((res) => ({ type: 'counselors', data: res })),
      );
    }

    // 7. Search Exams
    if (type === 'ALL' || type === 'EXAM') {
      promises.push(
        this.prisma.exam
          .findMany({
            where: {
              OR: [{ examName: searchFilter }, { category: searchFilter }],
            },
            take: 10,
          })
          .then((res) => ({ type: 'exams', data: res })),
      );
    }

    // 8. Search Scholarships
    if (type === 'ALL' || type === 'SCHOLARSHIP') {
      promises.push(
        this.prisma.scholarship
          .findMany({
            where: {
              OR: [
                { scholarshipName: searchFilter },
                { provider: searchFilter },
              ],
            },
            take: 10,
          })
          .then((res) => ({ type: 'scholarships', data: res })),
      );
    }

    // 9. Search Blogs
    if (type === 'ALL' || type === 'BLOG') {
      promises.push(
        this.prisma.blog
          .findMany({
            where: {
              OR: [{ title: searchFilter }, { category: searchFilter }],
            },
            take: 10,
          })
          .then((res) => ({ type: 'blogs', data: res })),
      );
    }

    // 10. Search Study Materials
    if (type === 'ALL' || type === 'STUDY_MATERIAL') {
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
              ],
            },
            take: 10,
            orderBy: { downloadCount: 'desc' },
          })
          .then((res) => ({ type: 'studyMaterials', data: res })),
      );
    }

    const results = await Promise.all(promises);

    // Reduce into a single object
    return results.reduce(
      (acc, curr) => {
        acc[curr.type] = curr.data;
        return acc;
      },
      {} as Record<string, any[]>,
    );
  }

  async getSuggestions(keyword: string) {
    const searchFilter = {
      contains: keyword,
      mode: 'insensitive' as const,
    };

    // Fetch concurrently
    const [colleges, courses, students, leads, applications] = await Promise.all([
      this.prisma.college.findMany({
        where: {
          OR: [{ name: searchFilter }, { city: searchFilter }],
          status: 'PUBLISHED',
        },
        select: { id: true, name: true, city: true, slug: true },
        take: 5,
      }),
      this.prisma.course.findMany({
        where: {
          name: searchFilter,
          status: 'PUBLISHED',
        },
        select: {
          id: true,
          name: true,
          slug: true,
          college: { select: { name: true } },
        },
        take: 5,
      }),
      this.prisma.user.findMany({
        where: {
          role: 'STUDENT',
          OR: [{ fullName: searchFilter }, { email: searchFilter }, { mobile: searchFilter }, { studentId: searchFilter }],
        },
        select: { id: true, fullName: true, email: true, mobile: true, studentId: true },
        take: 5,
      }),
      this.prisma.lead.findMany({
        where: {
          isDeleted: false,
          OR: [{ fullName: searchFilter }, { mobile: searchFilter }, { email: searchFilter }],
        },
        select: { id: true, fullName: true, mobile: true, status: true, preferredCourse: true },
        take: 5,
      }),
      this.prisma.application.findMany({
        where: {
          OR: [{ applicationId: searchFilter }, { applicationNumber: searchFilter }, { user: { fullName: searchFilter } }],
        },
        select: { id: true, applicationId: true, applicationNumber: true, status: true, user: { select: { fullName: true } } },
        take: 5,
      }),
    ]);

    return {
      colleges: colleges.map((c) => ({ ...c, type: 'college' })),
      courses: courses.map((c) => ({ ...c, type: 'course' })),
      students: students.map((s) => ({ ...s, name: s.fullName, type: 'student' })),
      leads: leads.map((l) => ({ ...l, name: l.fullName, type: 'lead' })),
      applications: applications.map((a) => ({
        ...a,
        name: `${a.applicationNumber || a.applicationId} (${a.user?.fullName || 'Applicant'})`,
        type: 'application',
      })),
    };
  }

  async getTrendingSearches() {
    return [
      { text: 'B.Tech in Computer Science', type: 'course' },
      { text: 'Top Engineering Colleges in Delhi', type: 'college' },
      { text: 'MBA Programs', type: 'course' },
      { text: 'JEE Main Preparation', type: 'exam' },
      { text: 'Medical Colleges in Maharashtra', type: 'college' },
      { text: 'NEET Previous Year Papers', type: 'study_material' },
      { text: 'JEE Mock Tests', type: 'study_material' },
    ];
  }
}
