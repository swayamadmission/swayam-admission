export class GeoSeoUtility {
  private static SITE_URL =
    process.env.PUBLIC_SITE_URL || 'https://swayamadmission.org';

  /**
   * Generates Schema.org JSON-LD structured data for traditional SEO and Generative Engine Optimization (GEO).
   */
  static generateSchemaOrg(blog: any): any[] {
    const url = `${this.SITE_URL}/blog/${blog.slug}`;
    const datePublished = blog.publishedAt || blog.createdAt;
    const dateModified = blog.updatedAt || datePublished;

    const schemas: any[] = [];

    // 1. Article / BlogPosting Schema
    const articleSchema: any = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url,
      },
      headline: blog.seoTitle || blog.title,
      description: blog.seoDescription || blog.excerpt || blog.title,
      image:
        blog.featuredImage || blog.thumbnail
          ? [blog.featuredImage || blog.thumbnail]
          : [],
      datePublished: new Date(datePublished).toISOString(),
      dateModified: new Date(dateModified).toISOString(),
      author: {
        '@type': 'Person',
        name: blog.author?.fullName || 'SWAYAM ADMISSION Editorial Team',
      },
      publisher: {
        '@type': 'EducationalOrganization',
        name: 'SWAYAM ADMISSION CRM',
        url: this.SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${this.SITE_URL}/assets/SA_logo.jpg`,
        },
      },
      articleSection: blog.category,
      keywords: Array.isArray(blog.tags)
        ? blog.tags.join(', ')
        : blog.tags || '',
    };

    schemas.push(articleSchema);

    // 2. BreadcrumbList Schema
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: this.SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blogs & Guides',
          item: `${this.SITE_URL}/blogs`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: blog.title,
          item: url,
        },
      ],
    };
    schemas.push(breadcrumbSchema);

    // 3. FAQPage Schema (if FAQs present)
    if (Array.isArray(blog.faqs) && blog.faqs.length > 0) {
      const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: blog.faqs.map((faq: any) => ({
          '@type': 'Question',
          name: faq.question || faq.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer || faq.a,
          },
        })),
      };
      schemas.push(faqSchema);
    }

    // 4. College / University Schema link
    if (blog.college) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'CollegeOrUniversity',
        name: blog.college.name,
        url:
          blog.college.website ||
          `${this.SITE_URL}/colleges/${blog.college.slug}`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: blog.college.city,
          addressRegion: blog.college.state,
          addressCountry: 'India',
        },
      });
    }

    // 5. Course Schema link
    if (blog.course) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: blog.course.name,
        description:
          blog.course.description || `${blog.course.name} Course Details`,
        provider: {
          '@type': 'EducationalOrganization',
          name: blog.college?.name || 'SWAYAM ADMISSION',
        },
      });
    }

    return schemas;
  }

  /**
   * Calculates Readability, SEO, GEO, and AI Readiness scores for an article.
   */
  static calculateScores(blog: any): {
    readabilityScore: number;
    seoScore: number;
    geoScore: number;
    aiReadinessScore: number;
  } {
    const content = blog.content || '';
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const hasHeadings = /<h[2-4]/i.test(content) || /##/i.test(content);
    const hasFaqs = Array.isArray(blog.faqs) && blog.faqs.length > 0;
    const hasKeyTakeaways =
      Array.isArray(blog.keyTakeaways) && blog.keyTakeaways.length > 0;
    const hasSeoMeta = Boolean(blog.seoTitle && blog.seoDescription);
    const hasSummary = Boolean(blog.aiSummary || blog.tldr);

    // Readability Score
    let readabilityScore = 70;
    if (wordCount >= 300) readabilityScore += 10;
    if (wordCount >= 600) readabilityScore += 10;
    if (hasHeadings) readabilityScore += 10;
    readabilityScore = Math.min(100, readabilityScore);

    // SEO Score
    let seoScore = 65;
    if (hasSeoMeta) seoScore += 15;
    if (blog.canonicalUrl) seoScore += 5;
    if (Array.isArray(blog.tags) && blog.tags.length > 0) seoScore += 10;
    if (blog.featuredImage || blog.thumbnail) seoScore += 5;
    seoScore = Math.min(100, seoScore);

    // GEO (Generative Engine Optimization) Score
    let geoScore = 60;
    if (hasFaqs) geoScore += 15;
    if (hasKeyTakeaways) geoScore += 15;
    if (hasSummary) geoScore += 10;
    geoScore = Math.min(100, geoScore);

    // AI Readiness Score
    let aiReadinessScore = Math.round(
      (readabilityScore + seoScore + geoScore) / 3,
    );
    aiReadinessScore = Math.min(100, aiReadinessScore);

    return {
      readabilityScore,
      seoScore,
      geoScore,
      aiReadinessScore,
    };
  }

  /**
   * Helper to calculate reading time in minutes based on word count (approx. 200 wpm).
   */
  static calculateReadingTime(content: string): number {
    const text = content.replace(/<[^>]*>/g, '');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }

  /**
   * Auto-generates a clean URL slug from title.
   */
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
