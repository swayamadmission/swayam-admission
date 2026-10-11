const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Let's set distinct titles and feature 4 real materials
  await prisma.studyMaterial.update({
    where: { id: 'cmu1llj1r015wq04weifkju6k' },
    data: {
      title: '12th Chemistry Model Paper for Session 2027',
      featured: true,
      status: 'PUBLISHED',
      downloadCount: 342,
    }
  });

  await prisma.studyMaterial.update({
    where: { id: 'cmu1dzlg10155q0vovghy365s' },
    data: {
      title: 'Premium NEET UG 2026 Solved Papers & High-Yield Formulae',
      featured: true,
      status: 'PUBLISHED',
      downloadCount: 512,
    }
  });

  await prisma.studyMaterial.update({
    where: { id: 'cmu1edb5q0151q0h8zml88ryv' },
    data: {
      title: 'Engineering Mathematics I Complete Handwritten Notes 2026',
      featured: true,
      status: 'PUBLISHED',
      downloadCount: 280,
    }
  });

  await prisma.studyMaterial.update({
    where: { id: 'cmu1bae18015fq010shz1462v' },
    data: {
      title: 'Biology Master Study Guide & High-Yield Diagrams',
      featured: true,
      status: 'PUBLISHED',
      downloadCount: 195,
      price: 149,
      fileSize: '4.2 MB',
    }
  });

  // Make sure other duplicate NEET UG records are not featured
  await prisma.studyMaterial.updateMany({
    where: {
      id: { notIn: ['cmu1llj1r015wq04weifkju6k', 'cmu1dzlg10155q0vovghy365s', 'cmu1edb5q0151q0h8zml88ryv', 'cmu1bae18015fq010shz1462v'] },
      featured: true
    },
    data: { featured: false }
  });

  console.log('Updated 4 distinct featured study materials.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
