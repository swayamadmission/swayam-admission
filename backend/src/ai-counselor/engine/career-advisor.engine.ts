/**
 * Career Advisor Engine
 *
 * Generates career path recommendations based on:
 * - Stream alignment
 * - Interest keyword matching
 * - Career goal matching
 * - Marks-based tier assessment
 *
 * Also matches scholarships to student profile.
 */

import {
  StudentInput,
  CareerPath,
  ScholarshipInfo,
} from '../interfaces/recommendation.interface';
import { CAREERS_DATABASE, CareerData } from '../knowledge/careers.knowledge';
import {
  SCHOLARSHIPS_DATABASE,
  ScholarshipData,
} from '../knowledge/scholarships.knowledge';

// ================================
// CAREER PATH MATCHING
// ================================

function calculateCareerRelevance(
  career: CareerData,
  input: StudentInput,
): number {
  let score = 0;

  // Stream match (strongest signal)
  if (career.streams.includes(input.stream)) {
    score += 35;
  }

  // Interest keyword matching
  const interestsLower = input.interests.map((i) => i.toLowerCase());
  let keywordMatches = 0;
  for (const keyword of career.keywords) {
    if (
      interestsLower.some(
        (interest) => interest.includes(keyword) || keyword.includes(interest),
      )
    ) {
      keywordMatches++;
    }
  }
  score += Math.min(keywordMatches * 10, 35);

  // Career goal match
  if (input.careerGoal) {
    const goalLower = input.careerGoal.toLowerCase();
    const titleLower = career.title.toLowerCase();

    if (titleLower.includes(goalLower) || goalLower.includes(titleLower)) {
      score += 20;
    } else {
      // Partial keyword match in career goal
      const goalWords = goalLower.split(/\s+/);
      const careerWords = [...career.keywords, ...titleLower.split(/\s+/)];
      const partialMatches = goalWords.filter((gw) =>
        careerWords.some((cw) => cw.includes(gw) || gw.includes(cw)),
      );
      score += Math.min(partialMatches.length * 5, 15);
    }
  }

  // Marks-based tier assessment (subtle factor)
  const avgMarks = (input.tenthMarks + input.twelfthMarks) / 2;
  if (avgMarks >= 80)
    score += 10; // can aim for top careers
  else if (avgMarks >= 60) score += 5;

  return Math.min(score, 100);
}

export function matchCareers(
  input: StudentInput,
  topN: number = 5,
): CareerPath[] {
  const results: { career: CareerData; relevanceScore: number }[] = [];

  for (const career of CAREERS_DATABASE) {
    const relevanceScore = calculateCareerRelevance(career, input);

    // Only include careers with some relevance
    if (relevanceScore >= 20) {
      results.push({ career, relevanceScore });
    }
  }

  // Sort by relevance
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return results.slice(0, topN).map(({ career, relevanceScore }) => ({
    title: career.title,
    stream: career.streams,
    description: career.description,
    requiredExams: career.requiredExams,
    averageSalary: career.averageSalary,
    growthOutlook: career.growthOutlook,
    steps: career.steps,
    relevanceScore,
  }));
}

// ================================
// SCHOLARSHIP MATCHING
// ================================

function isScholarshipEligible(
  scholarship: ScholarshipData,
  input: StudentInput,
): boolean {
  // Stream check
  if (
    !scholarship.streams.includes(input.stream) &&
    !scholarship.streams.includes('OTHER')
  ) {
    return false;
  }

  // Marks check
  const avgMarks = (input.tenthMarks + input.twelfthMarks) / 2;
  if (avgMarks < scholarship.minMarksRequired) {
    return false;
  }

  return true;
}

export function matchScholarships(input: StudentInput): ScholarshipInfo[] {
  const results: ScholarshipInfo[] = [];

  for (const scholarship of SCHOLARSHIPS_DATABASE) {
    const eligible = isScholarshipEligible(scholarship, input);

    // Only return scholarships the student could qualify for
    if (
      eligible ||
      scholarship.category === 'GENERAL' ||
      scholarship.category === 'MERIT'
    ) {
      results.push({
        name: scholarship.name,
        provider: scholarship.provider,
        amount: scholarship.amount,
        eligibility: scholarship.eligibility,
        category: scholarship.category,
        isEligible: eligible,
        applicationDeadline: scholarship.applicationDeadline,
        website: scholarship.website,
      });
    }
  }

  // Sort eligible first
  results.sort((a, b) => {
    if (a.isEligible !== b.isEligible) {
      return a.isEligible ? -1 : 1;
    }
    return 0;
  });

  return results;
}

// ================================
// PERSONALIZED ADVICE GENERATOR
// ================================

export function generatePersonalizedAdvice(input: StudentInput): string[] {
  const advice: string[] = [];
  const avgMarks = (input.tenthMarks + input.twelfthMarks) / 2;

  // Marks-based advice
  if (avgMarks >= 85) {
    advice.push(
      '🌟 Your excellent academic record opens doors to top-tier institutions. Aim high and apply to premium colleges!',
    );
  } else if (avgMarks >= 70) {
    advice.push(
      '📚 Your marks are competitive for most good colleges. Focus on entrance exam preparation to boost your chances.',
    );
  } else if (avgMarks >= 55) {
    advice.push(
      '💪 Solid marks! Consider a mix of government and private colleges. Entrance exam scores can compensate.',
    );
  } else {
    advice.push(
      '🎯 Focus on entrance exam preparation — many colleges give more weightage to entrance scores than board marks.',
    );
  }

  // Stream-specific advice
  if (input.stream === 'SCIENCE') {
    if (
      input.interests.some((i) =>
        ['medical', 'doctor', 'mbbs', 'neet', 'biology'].includes(
          i.toLowerCase(),
        ),
      )
    ) {
      advice.push(
        '🏥 For medical aspirations, NEET is mandatory. Start NCERT-focused preparation at least 1 year before the exam.',
      );
    }
    if (
      input.interests.some((i) =>
        ['engineering', 'computer', 'tech', 'it', 'software', 'jee'].includes(
          i.toLowerCase(),
        ),
      )
    ) {
      advice.push(
        '💻 For engineering, JEE Main opens NITs/IIITs and JEE Advanced opens IITs. Practice at least 100 mock tests.',
      );
    }
  } else if (input.stream === 'COMMERCE') {
    advice.push(
      '📊 Commerce offers diverse paths — CA, MBA, banking, or entrepreneurship. CUET and CAT are key entrance exams.',
    );
  } else if (input.stream === 'ARTS') {
    advice.push(
      '🎨 Arts graduates are thriving in law (CLAT), civil services (UPSC), design (NIFT), and digital content creation.',
    );
  }

  // Budget advice
  if (input.budgetMax <= 100000) {
    advice.push(
      '💰 On a tight budget? Government colleges and national scholarship portals (scholarships.gov.in) are your best friends.',
    );
  }

  // Location advice
  if (
    input.preferredStates.some((s) =>
      ['Bihar', 'Jharkhand', 'Uttar Pradesh'].includes(s),
    )
  ) {
    advice.push(
      "📍 Consider colleges in Delhi, Chandigarh, or Kolkata — they're nearby and have excellent institutions at reasonable costs.",
    );
  }

  // Career goal advice
  if (input.careerGoal) {
    advice.push(
      `🎯 You mentioned "${input.careerGoal}" as your career goal. The recommended career paths below show step-by-step roadmaps to get there.`,
    );
  }

  return advice;
}
