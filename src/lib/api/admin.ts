import { collection, doc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { rowsFromQuery } from '@/lib/firestore';
import type { CourseCategory, CourseLevel, Lesson, Module } from '@/lib/types';

export interface CourseInput {
  title: string;
  subtitle: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  instructor_name: string;
  instructor_title: string;
  price_cents: number;
  duration_hours: number;
  thumbnail_url: string;
  is_published: boolean;
}

function slugify(text: string): string {
  return `${text}-${Date.now().toString(36)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createCourse(input: CourseInput): Promise<void> {
  const ref = doc(collection(db, 'courses'));
  await setDoc(ref, {
    ...input,
    slug: slugify(input.title),
    instructor_bio: '',
    rating: 0,
    review_count: 0,
    learning_outcomes: [],
    created_at: new Date().toISOString(),
  });
}

export async function updateCourse(courseId: string, input: CourseInput): Promise<void> {
  await updateDoc(doc(db, 'courses', courseId), { ...input });
}

export async function ensureModule(courseId: string): Promise<Module> {
  const snap = await getDocs(collection(db, 'courses', courseId, 'modules'));
  const existing = rowsFromQuery<Module>(snap).sort((a, b) => a.position - b.position)[0];
  if (existing) return existing;

  const ref = doc(collection(db, 'courses', courseId, 'modules'));
  const module = { course_id: courseId, title: 'Course recordings', position: 1 };
  await setDoc(ref, module);
  return { id: ref.id, ...module };
}

export interface LessonInput {
  course_id: string;
  module_id: string;
  title: string;
  description: string;
  video_url: string;
  duration_minutes: number;
  position: number;
  is_preview: boolean;
}

export async function createLesson(input: LessonInput): Promise<void> {
  const { video_url: videoUrl, ...lesson } = input;
  const batch = writeBatch(db);
  const lessonRef = doc(collection(db, 'courses', input.course_id, 'lessons'));
  batch.set(lessonRef, lesson);
  batch.set(doc(db, 'lesson_media', lessonRef.id), { course_id: input.course_id, video_url: videoUrl });
  await batch.commit();
}

export function nextLessonPosition(lessons: Lesson[]): number {
  return lessons.reduce((max, l) => Math.max(max, l.position), 0) + 1;
}
