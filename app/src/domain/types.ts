export const GRADES = ['junior', 'middle', 'senior'] as const;
export type Grade = (typeof GRADES)[number];

export const TOPICS = ['javascript', 'typescript', 'react', 'html', 'css'] as const;
export type Topic = (typeof TOPICS)[number];

export function isGrade(value: string): value is Grade {
  return (GRADES as readonly string[]).includes(value);
}

export type Question = {
  id: string;
  topic: Topic;
  grade: Grade;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  code: string | null;
};
