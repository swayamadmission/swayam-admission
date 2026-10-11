import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const extraPerms = [
      // Career & Admission Guides / CMS
      {
        module: 'guides',
        resource: 'CareerGuideBlog',
        action: 'view',
        code: 'guides.view',
        description: 'View Career & Admission Guides / CMS articles and guides',
        category: 'CONTENT',
        group: 'Content',
      },
      {
        module: 'guides',
        resource: 'CareerGuideBlog',
        action: 'create',
        code: 'guides.create',
        description: 'Create Career & Admission Guides / CMS articles and guides',
        category: 'CONTENT',
        group: 'Content',
      },
      {
        module: 'guides',
        resource: 'CareerGuideBlog',
        action: 'edit',
        code: 'guides.edit',
        description: 'Edit Career & Admission Guides / CMS articles and guides',
        category: 'CONTENT',
        group: 'Content',
      },
      {
        module: 'guides',
        resource: 'CareerGuideBlog',
        action: 'delete',
        code: 'guides.delete',
        description: 'Delete Career & Admission Guides / CMS articles and guides',
        category: 'CONTENT',
        group: 'Content',
      },
      {
        module: 'guides',
        resource: 'CareerGuideBlog',
        action: 'export',
        code: 'guides.export',
        description: 'Export Career & Admission Guides / CMS articles and guides to CSV',
        category: 'CONTENT',
        group: 'Content',
      },
      {
        module: 'guides',
        resource: 'CareerGuideBlog',
        action: 'approve',
        code: 'guides.approve',
        description: 'Approve and publish Career & Admission Guides / CMS articles and guides',
        category: 'CONTENT',
        group: 'Content',
      },
      {
        module: 'guides',
        resource: 'CareerGuideBlog',
        action: 'publish',
        code: 'guides.publish',
        description: 'Publish Career & Admission Guides / CMS articles and guides',
        category: 'CONTENT',
        group: 'Content',
      },

      // Success Stories
      {
        module: 'success-stories',
        resource: 'Testimonial',
        action: 'view',
        code: 'success-stories.view',
        description: 'View verified student success stories and testimonials',
        category: 'CONTENT',
        group: 'Content',
      },
      {
        module: 'success-stories',
        resource: 'Testimonial',
        action: 'create',
        code: 'success-stories.create',
        description: 'Create new student success stories and testimonials',
        category: 'CONTENT',
        group: 'Content',
      },
      {
        module: 'success-stories',
        resource: 'Testimonial',
        action: 'edit',
        code: 'success-stories.edit',
        description: 'Edit student success stories and testimonials',
        category: 'CONTENT',
        group: 'Content',
      },
      {
        module: 'success-stories',
        resource: 'Testimonial',
        action: 'delete',
        code: 'success-stories.delete',
        description: 'Delete/archive student success stories and testimonials',
        category: 'CONTENT',
        group: 'Content',
      },
      {
        module: 'success-stories',
        resource: 'Testimonial',
        action: 'export',
        code: 'success-stories.export',
        description: 'Export student success stories and testimonials to CSV',
        category: 'CONTENT',
        group: 'Content',
      },
      {
        module: 'success-stories',
        resource: 'Testimonial',
        action: 'approve',
        code: 'success-stories.approve',
        description: 'Approve and publish student success stories to Home Page',
        category: 'CONTENT',
        group: 'Content',
      },
    ];

    console.log('Seeding canonical guides & success-stories permissions...');
    for (const p of extraPerms) {
      await prisma.permission.upsert({
        where: { code: p.code },
        update: p,
        create: p,
      });
      console.log(`  Seeded: ${p.code}`);
    }

    console.log('✅ Canonical permissions seeded successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
