/**
 * Exam Matcher Engine
 *
 * Matches Indian entrance exams to student's profile based on:
 * - Stream alignment
 * - Marks threshold (minimum eligibility)
 * - Interest keywords
 *
 * Returns sorted list with eligibility status.
 */

import {
  StudentInput,
  ExamSuggestion,
} from '../interfaces/recommendation.interface';
import { EXAMS_DATABASE, ExamData } from '../knowledge/exams.knowledge';

function isEligible(exam: ExamData, input: StudentInput): boolean {
  // Check stream alignment
  const streamMatch = exam.streams.includes(input.stream);
  if (!streamMatch) return false;

  // Check minimum marks
  const avgMarks = (input.tenthMarks + input.twelfthMarks) / 2;
  return avgMarks >= exam.minMarksRequired;
}

function calculateRelevance(exam: ExamData, input: StudentInput): number {
  let score = 0;

  // Stream match
  if (exam.streams.includes(input.stream)) score += 40;

  // Marks threshold match
  const avgMarks = (input.tenthMarks + input.twelfthMarks) / 2;
  if (avgMarks >= exam.minMarksRequired) {
    score += 30;
    // Bonus for exceeding requirements significantly
    const excess = avgMarks - exam.minMarksRequired;
    score += Math.min(excess / 2, 15);
  }

  // Interest keyword match
  const examNameLower =
    exam.name.toLowerCase() + ' ' + exam.fullName.toLowerCase();
  const interestMatch = input.interests.some((interest) =>
    examNameLower.includes(interest.toLowerCase()),
  );
  if (interestMatch) score += 15;

  // Career goal match
  if (input.careerGoal) {
    const goalLower = input.careerGoal.toLowerCase();
    if (
      examNameLower.includes(goalLower) ||
      exam.description.toLowerCase().includes(goalLower)
    ) {
      score += 10;
    }
  }

  return Math.min(score, 100);
}

export function matchExams(input: StudentInput): ExamSuggestion[] {
  const results: (ExamSuggestion & { relevance: number })[] = [];

  for (const exam of EXAMS_DATABASE) {
    // Only include exams that match the student's stream
    if (
      !exam.streams.includes(input.stream) &&
      !exam.streams.includes('OTHER')
    ) {
      continue;
    }

    const eligible = isEligible(exam, input);
    const relevance = calculateRelevance(exam, input);

    results.push({
      name: exam.name,
      fullName: exam.fullName,
      stream: exam.streams,
      description: exam.description,
      eligibility: exam.eligibility,
      isEligible: eligible,
      examMonth: exam.examMonth,
      preparationTips: exam.preparationTips,
      officialWebsite: exam.officialWebsite,
      relevance,
    });
  }

  // Sort by relevance descending, eligible first
  results.sort((a, b) => {
    if (a.isEligible !== b.isEligible) {
      return a.isEligible ? -1 : 1;
    }
    return b.relevance - a.relevance;
  });

  // Return without the internal relevance field
  return results.map(({ relevance, ...rest }) => rest);
}
