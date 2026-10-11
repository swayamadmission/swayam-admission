import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const courses = await prisma.course.count();
    const featuredCourses = await prisma.course.count({ where: { featured: true } });
    const activeCourses = await prisma.course.count({ where: { status: { in: ['ACTIVE', 'PUBLISHED'] } } });

    const states = await prisma.state.count();
    const collegesPerState = await prisma.college.groupBy({
      by: ['state'],
      _count: { id: true },
      where: { status: { in: ['ACTIVE', 'PUBLISHED'] } },
    });

    const colleges = await prisma.college.count();
    const featuredColleges = await prisma.college.count({ where: { featured: true } });
    const activeColleges = await prisma.college.count({ where: { status: { in: ['ACTIVE', 'PUBLISHED'] } } });

    const studyMaterials = await prisma.studyMaterial.count();
    const featuredStudyMaterials = await prisma.studyMaterial.count({ where: { featured: true } });
    const publishedStudyMaterials = await prisma.studyMaterial.count({ where: { status: 'PUBLISHED' } });

    const blogs = await prisma.blog.count();
    const featuredBlogs = await prisma.blog.count({ where: { featured: true } });
    const publishedBlogs = await prisma.blog.count({ where: { status: 'PUBLISHED' } });

    const testimonials = await prisma.testimonial.count();
    const featuredTestimonials = await prisma.testimonial.count({ where: { featured: true } });
    const publishedTestimonials = await prisma.testimonial.count({ where: { status: { in: ['PUBLISHED', 'APPROVED', 'ACTIVE'] } } });

    const faqs = await prisma.fAQ.count();
    const featuredFaqs = await prisma.fAQ.count({ where: { featured: true } });
    const publishedFaqs = await prisma.fAQ.count({ where: { status: 'PUBLISHED' } });

    console.log(JSON.stringify({
      courses: { total: courses, active: activeCourses, featured: featuredCourses },
      states: { total: states, stateCollegesCount: collegesPerState },
      colleges: { total: colleges, active: activeColleges, featured: featuredColleges },
      studyMaterials: { total: studyMaterials, published: publishedStudyMaterials, featured: featuredStudyMaterials },
      blogs: { total: blogs, published: publishedBlogs, featured: featuredBlogs },
      testimonials: { total: testimonials, published: publishedTestimonials, featured: featuredTestimonials },
      faqs: { total: faqs, published: publishedFaqs, featured: featuredFaqs }
    }, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
check();
