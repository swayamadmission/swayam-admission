/**
 * College & Course Recommendation Scoring Engine
 *
 * Scores each college+course combination against student preferences.
 * 6 weighted factors:
 *   - Marks Match:       25%
 *   - Budget Match:      20%
 *   - Stream Match:      20%
 *   - Location Match:    15%
 *   - College Type:      10%
 *   - Seat Availability: 10%
 *
 * Returns top 10 recommendations sorted by total score.
 * Modular design — each scoring function can be individually tuned.
 */

import {
  StudentInput,
  RecommendationResult,
  ScoreBreakdown,
} from '../interfaces/recommendation.interface';

interface CollegeCourseData {
  collegeId: string;
  collegeName: string;
  collegeCity: string;
  collegeState: string;
  collegeType: string;
  courseId: string;
  courseName: string;
  courseFees: number;
  courseDuration: string;
  courseSeats: number;
}

// ================================
// NEIGHBORING STATES MAP (India)
// ================================
const NEIGHBORING_STATES: Record<string, string[]> = {
  Bihar: ['Jharkhand', 'Uttar Pradesh', 'West Bengal'],
  Jharkhand: [
    'Bihar',
    'West Bengal',
    'Odisha',
    'Chhattisgarh',
    'Uttar Pradesh',
  ],
  'Uttar Pradesh': [
    'Bihar',
    'Jharkhand',
    'Madhya Pradesh',
    'Rajasthan',
    'Delhi',
    'Haryana',
    'Uttarakhand',
  ],
  Delhi: ['Haryana', 'Uttar Pradesh', 'Rajasthan'],
  Haryana: [
    'Delhi',
    'Uttar Pradesh',
    'Punjab',
    'Rajasthan',
    'Himachal Pradesh',
  ],
  Punjab: ['Haryana', 'Himachal Pradesh', 'Rajasthan', 'Jammu & Kashmir'],
  Rajasthan: [
    'Gujarat',
    'Madhya Pradesh',
    'Uttar Pradesh',
    'Haryana',
    'Delhi',
    'Punjab',
  ],
  Maharashtra: ['Gujarat', 'Madhya Pradesh', 'Karnataka', 'Goa', 'Telangana'],
  Karnataka: [
    'Maharashtra',
    'Goa',
    'Kerala',
    'Tamil Nadu',
    'Telangana',
    'Andhra Pradesh',
  ],
  'Tamil Nadu': ['Kerala', 'Karnataka', 'Andhra Pradesh'],
  Kerala: ['Tamil Nadu', 'Karnataka'],
  'Andhra Pradesh': ['Telangana', 'Tamil Nadu', 'Karnataka', 'Odisha'],
  Telangana: ['Maharashtra', 'Karnataka', 'Andhra Pradesh', 'Chhattisgarh'],
  'West Bengal': ['Bihar', 'Jharkhand', 'Odisha', 'Sikkim'],
  'Madhya Pradesh': [
    'Uttar Pradesh',
    'Rajasthan',
    'Gujarat',
    'Maharashtra',
    'Chhattisgarh',
  ],
  Gujarat: ['Rajasthan', 'Madhya Pradesh', 'Maharashtra'],
  Odisha: ['West Bengal', 'Jharkhand', 'Chhattisgarh', 'Andhra Pradesh'],
  Chhattisgarh: [
    'Madhya Pradesh',
    'Uttar Pradesh',
    'Jharkhand',
    'Odisha',
    'Maharashtra',
    'Telangana',
  ],
  Uttarakhand: ['Uttar Pradesh', 'Himachal Pradesh'],
  'Himachal Pradesh': ['Punjab', 'Haryana', 'Uttarakhand', 'Jammu & Kashmir'],
  Assam: [
    'Meghalaya',
    'Nagaland',
    'Manipur',
    'Mizoram',
    'Tripura',
    'Arunachal Pradesh',
    'West Bengal',
  ],
};

// ================================
// STREAM → COURSE KEYWORD MAPPING
// ================================
const STREAM_COURSE_KEYWORDS: Record<string, string[]> = {
  SCIENCE: [
    'b.tech',
    'btech',
    'engineering',
    'mbbs',
    'bds',
    'b.sc',
    'bsc',
    'pharmacy',
    'b.pharm',
    'bca',
    'computer',
    'science',
    'medical',
    'biotech',
    'nursing',
    'architecture',
    'b.arch',
    'it',
    'electronics',
    'mechanical',
    'civil',
    'electrical',
    'chemical',
  ],
  COMMERCE: [
    'b.com',
    'bcom',
    'bba',
    'mba',
    'commerce',
    'business',
    'finance',
    'accounting',
    'ca',
    'economics',
    'banking',
    'management',
    'bms',
    'hotel management',
    'event management',
  ],
  ARTS: [
    'b.a',
    'ba',
    'arts',
    'humanities',
    'english',
    'history',
    'political',
    'sociology',
    'psychology',
    'journalism',
    'law',
    'llb',
    'design',
    'fashion',
    'film',
    'media',
    'mass communication',
    'social work',
    'education',
    'b.ed',
    'fine arts',
  ],
  OTHER: ['diploma', 'vocational', 'skill', 'polytechnic', 'iti'],
};

// ================================
// INDIVIDUAL SCORING FUNCTIONS
// ================================

/**
 * Marks Score (weight: 25%)
 * Higher marks → better college tiers
 * Also considers course-level selectivity
 */
function calculateMarksScore(
  input: StudentInput,
  data: CollegeCourseData,
): number {
  const avgMarks = (input.tenthMarks + input.twelfthMarks) / 2;
  const fees = data.courseFees;

  // Premium colleges (high fees) expect high marks
  // Affordable colleges accept lower marks
  // This creates natural tiering

  if (fees > 300000) {
    // Premium colleges — needs 75%+
    if (avgMarks >= 85) return 95;
    if (avgMarks >= 75) return 80;
    if (avgMarks >= 65) return 55;
    if (avgMarks >= 50) return 30;
    return 15;
  }

  if (fees > 100000) {
    // Mid-tier — needs 60%+
    if (avgMarks >= 80) return 95;
    if (avgMarks >= 65) return 85;
    if (avgMarks >= 50) return 70;
    if (avgMarks >= 40) return 50;
    return 30;
  }

  // Affordable/govt colleges — broader acceptance
  if (avgMarks >= 75) return 95;
  if (avgMarks >= 60) return 85;
  if (avgMarks >= 45) return 75;
  if (avgMarks >= 35) return 60;
  return 45;
}

/**
 * Budget Score (weight: 20%)
 * Course fees within student's budget range
 * Full score if within range, declining beyond
 */
function calculateBudgetScore(
  input: StudentInput,
  data: CollegeCourseData,
): number {
  const fees = data.courseFees;
  const maxBudget = input.budgetMax;
  const minBudget = input.budgetMin || 0;

  // Perfectly within budget
  if (fees >= minBudget && fees <= maxBudget) {
    return 100;
  }

  // Slightly over budget (within 20% above max)
  if (fees > maxBudget) {
    const overPercentage = ((fees - maxBudget) / maxBudget) * 100;
    if (overPercentage <= 10) return 75;
    if (overPercentage <= 20) return 50;
    if (overPercentage <= 40) return 25;
    return 5;
  }

  // Under minimum budget (student wants premium, fees too low)
  if (fees < minBudget) {
    return 60; // still acceptable
  }

  return 50;
}

/**
 * Location Score (weight: 15%)
 * Same state, preferred city, neighboring states
 */
function calculateLocationScore(
  input: StudentInput,
  data: CollegeCourseData,
): number {
  const collegeState = data.collegeState.toLowerCase().trim();
  const collegeCity = data.collegeCity.toLowerCase().trim();
  let score = 50; // base score for any location

  // Preferred city match — highest score
  if (input.preferredCities.length > 0) {
    const cityMatch = input.preferredCities.some(
      (c) => c.toLowerCase().trim() === collegeCity,
    );
    if (cityMatch) return 100;
  }

  // Preferred state match
  if (input.preferredStates.length > 0) {
    const stateMatch = input.preferredStates.some(
      (s) => s.toLowerCase().trim() === collegeState,
    );
    if (stateMatch) return 90;

    // Neighboring state check
    for (const prefState of input.preferredStates) {
      const neighbors = NEIGHBORING_STATES[prefState] || [];
      const isNeighbor = neighbors.some(
        (n) => n.toLowerCase().trim() === collegeState,
      );
      if (isNeighbor) {
        score = Math.max(score, 70);
      }
    }
  }

  // If no location preference specified, all locations are equal
  if (
    input.preferredStates.length === 0 &&
    input.preferredCities.length === 0
  ) {
    return 80;
  }

  return score;
}

/**
 * Stream/Interest Match Score (weight: 20%)
 * Fuzzy-matches course name against student's stream and interests
 */
function calculateStreamScore(
  input: StudentInput,
  data: CollegeCourseData,
): number {
  const courseName = data.courseName.toLowerCase();
  const streamKeywords = STREAM_COURSE_KEYWORDS[input.stream] || [];

  // Check stream alignment
  const streamMatch = streamKeywords.some((kw) => courseName.includes(kw));

  // Check interest alignment
  const interestMatch = input.interests.some((interest) => {
    const lowerInterest = interest.toLowerCase();
    return (
      courseName.includes(lowerInterest) ||
      lowerInterest.includes(courseName.split(' ')[0].toLowerCase())
    );
  });

  // Also check if any interest keyword partially matches
  const partialInterestMatch = input.interests.some((interest) => {
    const words = interest.toLowerCase().split(' ');
    return words.some((w) => w.length >= 3 && courseName.includes(w));
  });

  if (streamMatch && interestMatch) return 100;
  if (interestMatch) return 90;
  if (streamMatch && partialInterestMatch) return 85;
  if (streamMatch) return 70;
  if (partialInterestMatch) return 55;

  return 20; // poor match
}

/**
 * College Type Score (weight: 10%)
 * Matches student's government/private preference
 */
function calculateCollegeTypeScore(
  input: StudentInput,
  data: CollegeCourseData,
): number {
  const preference = (input.collegeType || 'ANY').toUpperCase();
  const collegeType = data.collegeType.toUpperCase();

  if (preference === 'ANY') return 80;

  if (preference === collegeType) return 100;

  // Government preference but private college
  if (preference === 'GOVERNMENT' && collegeType !== 'GOVERNMENT') return 35;

  // Private preference but government college
  if (preference === 'PRIVATE' && collegeType !== 'PRIVATE') return 50;

  return 60;
}

/**
 * Seat Availability Score (weight: 10%)
 * More available seats → easier to get in
 */
function calculateSeatScore(data: CollegeCourseData): number {
  const seats = data.courseSeats;
  if (seats >= 200) return 90;
  if (seats >= 120) return 80;
  if (seats >= 60) return 70;
  if (seats >= 30) return 55;
  return 40;
}

// ================================
// MAIN SCORING FUNCTION
// ================================

function getMatchLevel(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'LOW' {
  if (score >= 80) return 'EXCELLENT';
  if (score >= 65) return 'GOOD';
  if (score >= 45) return 'FAIR';
  return 'LOW';
}

function generateReasoning(
  input: StudentInput,
  data: CollegeCourseData,
  breakdown: ScoreBreakdown,
  totalScore: number,
): string {
  const parts: string[] = [];
  const avgMarks = (input.tenthMarks + input.twelfthMarks) / 2;

  if (breakdown.streamScore >= 80) {
    parts.push(
      `${data.courseName} strongly aligns with your ${input.stream} background and interests`,
    );
  }

  if (breakdown.budgetScore >= 80) {
    parts.push(
      `fits well within your budget of ₹${input.budgetMax.toLocaleString('en-IN')}`,
    );
  } else if (breakdown.budgetScore < 50) {
    parts.push(
      `fees of ₹${data.courseFees.toLocaleString('en-IN')} may exceed your budget`,
    );
  }

  if (breakdown.locationScore >= 80) {
    parts.push(
      `located in your preferred area (${data.collegeCity}, ${data.collegeState})`,
    );
  }

  if (breakdown.marksScore >= 80) {
    parts.push(
      `your ${avgMarks.toFixed(0)}% marks make you a strong candidate`,
    );
  }

  if (data.collegeType === 'GOVERNMENT') {
    parts.push(
      'government college with lower fees and strong placement track record',
    );
  }

  if (parts.length === 0) {
    parts.push(
      `${data.collegeName} offers ${data.courseName} — overall ${totalScore.toFixed(0)}% match for your profile`,
    );
  }

  return parts.join('. ') + '.';
}

// ================================
// EXPORTED SCORING FUNCTION
// ================================

export function scoreCollegeCourse(
  input: StudentInput,
  data: CollegeCourseData,
): RecommendationResult {
  const breakdown: ScoreBreakdown = {
    marksScore: calculateMarksScore(input, data),
    budgetScore: calculateBudgetScore(input, data),
    locationScore: calculateLocationScore(input, data),
    streamScore: calculateStreamScore(input, data),
    collegeTypeScore: calculateCollegeTypeScore(input, data),
    seatScore: calculateSeatScore(data),
  };

  // Weighted total
  const totalScore =
    breakdown.marksScore * 0.25 +
    breakdown.budgetScore * 0.2 +
    breakdown.streamScore * 0.2 +
    breakdown.locationScore * 0.15 +
    breakdown.collegeTypeScore * 0.1 +
    breakdown.seatScore * 0.1;

  return {
    collegeId: data.collegeId,
    collegeName: data.collegeName,
    collegeCity: data.collegeCity,
    collegeState: data.collegeState,
    collegeType: data.collegeType,
    courseId: data.courseId,
    courseName: data.courseName,
    courseFees: data.courseFees,
    courseDuration: data.courseDuration,
    courseSeats: data.courseSeats,
    totalScore: Math.round(totalScore * 100) / 100,
    scoreBreakdown: breakdown,
    reasoning: generateReasoning(input, data, breakdown, totalScore),
    matchLevel: getMatchLevel(totalScore),
  };
}

/**
 * Score all college+course combinations and return top N results.
 */
export function rankRecommendations(
  input: StudentInput,
  collegeCourses: CollegeCourseData[],
  topN: number = 10,
): RecommendationResult[] {
  const scored = collegeCourses.map((cc) => scoreCollegeCourse(input, cc));

  // Sort by total score descending
  scored.sort((a, b) => b.totalScore - a.totalScore);

  // Return top N
  return scored.slice(0, topN);
}
