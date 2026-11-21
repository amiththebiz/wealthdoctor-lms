export type CourseCategory = 'stock-market' | 'personal-finance' | 'advanced-trading';
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type UserRole = 'student' | 'admin';

export const CATEGORY_LABELS: Record<CourseCategory, string> = {
  'stock-market': 'Stock Market',
  'personal-finance': 'Personal Finance',
  'advanced-trading': 'Advanced Trading',
};

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  created_at: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  instructor_name: string;
  instructor_title: string;
  instructor_bio: string;
  rating: number;
  review_count: number;
  duration_hours: number;
  price_cents: number;
  thumbnail_url: string;
  learning_outcomes: string[];
  is_published: boolean;
  created_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  position: number;
}

export interface Lesson {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  description: string;
  duration_minutes: number;
  position: number;
  is_preview: boolean;
}

export type ResourceType = 'pdf' | 'xlsx' | 'docx' | 'other';

export interface LessonResource {
  id: string;
  lesson_id: string;
  title: string;
  file_type: ResourceType;
  file_url: string;
  file_size_label: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: 'active' | 'revoked';
  price_paid_cents: number;
  enrolled_at: string;
}

export interface EnrollmentWithCourse extends Enrollment {
  courses: Course | null;
}

export interface LessonNote {
  id: string;
  lesson_id: string;
  body: string;
  video_seconds: number;
  created_at: string;
}

export interface DiscussionReply {
  id: string;
  question_id: string;
  author_name: string;
  is_instructor: boolean;
  body: string;
  created_at: string;
}

export interface DiscussionQuestion {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  author_name: string;
  body: string;
  is_resolved: boolean;
  created_at: string;
  discussion_replies: DiscussionReply[];
}

export interface Quiz {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  pass_score_pct: number;
  position: number;
}

export interface QuizQuestion {
  id: string;
  sort_order: number;
  question: string;
  options: string[];
}

export interface QuizAnswerResult {
  question_id: string;
  selected: number;
  correct_index: number;
  explanation: string;
  is_correct: boolean;
}

export interface QuizSubmissionResult {
  score_pct: number;
  correct: number;
  total: number;
  passed: boolean;
  pass_score_pct: number;
  results: QuizAnswerResult[];
}

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  student_name: string;
  course_title: string;
  certificate_code: string;
  issued_at: string;
}
