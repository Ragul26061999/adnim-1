// Type definitions for assessment-related data structures
declare module '@/types/assessment' {
  export interface Question {
    id: string;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correct?: string;
    explanation?: string;
    solution?: string;
    difficulty?: string;
    bloom?: string;
  }

  export interface Assessment {
    id: string;
    title: string;
    description?: string;
    classId: string;
    schoolId?: string;
    questions: string[]; // Array of question IDs
    duration?: number; // Duration in minutes
    startTime?: Date | null;
    endTime?: Date | null;
    isPublished?: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface AssessmentResult {
    id: string;
    assessmentId: string;
    studentId: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    submittedAt: Date;
    answers: {
      questionId: string;
      selectedOption: string;
      isCorrect: boolean;
    }[];
  }
}
