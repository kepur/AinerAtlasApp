export type ModuleInfo = {
  id: string; number: number; title: string; description: string; icon: string;
  completed: number; total: number; unlocked: boolean; complete: boolean;
  next_lesson: string; due_review: number; preview: string[];
};
export type LearningPathData = {
  language: string; name: string; native_name: string; version: string;
  modules: ModuleInfo[]; next_module: string; completed: number; total: number;
  practice: { today_count: number; daily_goal: number; streak_days: number; due_review_count: number };
};
export type Lesson = {
  id: string; title: string; rule: string; target: string; meaning: string;
  prompt: string; options: string[];
};
export type CourseModule = ModuleInfo & {
  language: string; name: string; voice: string; lessons: Lesson[];
  state: { completed?: string[]; mistakes?: string[]; last_lesson?: string };
};
export type LearningSummary = {
  language: string; name: string; path: LearningPathData; practice: LearningPathData["practice"];
  week: {date: string; attempts: number; correct: number}[];
  vocabulary: number; mastered_words: number; patterns: number; conversations: number; assets: number; games: number;
};
