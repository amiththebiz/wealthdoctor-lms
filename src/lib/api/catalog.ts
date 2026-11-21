import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isPermissionDenied, rowFromDoc, rowsFromQuery } from '@/lib/firestore';
import type { Course, Lesson, Module } from '@/lib/types';

function sortByCreated(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function fetchCourses(): Promise<Course[]> {
  const snap = await getDocs(query(collection(db, 'courses'), where('is_published', '==', true)));
  return sortByCreated(rowsFromQuery<Course>(snap));
}

export async function fetchAllCourses(): Promise<Course[]> {
  const snap = await getDocs(collection(db, 'courses'));
  return sortByCreated(rowsFromQuery<Course>(snap));
}

export async function fetchCourseBySlug(slug: string): Promise<Course | null> {
  const snap = await getDocs(
    query(collection(db, 'courses'), where('slug', '==', slug), where('is_published', '==', true)),
  );
  const first = snap.docs[0];
  return first ? rowFromDoc<Course>(first) : null;
}

export async function fetchCurriculum(courseId: string): Promise<{ modules: Module[]; lessons: Lesson[] }> {
  const courseRef = doc(db, 'courses', courseId);
  const [modulesSnap, lessonsSnap] = await Promise.all([
    getDocs(collection(courseRef, 'modules')),
    getDocs(collection(courseRef, 'lessons')),
  ]);
  const byPosition = <T extends { position: number }>(items: T[]) => [...items].sort((a, b) => a.position - b.position);
  return {
    modules: byPosition(rowsFromQuery<Module>(modulesSnap)),
    lessons: byPosition(rowsFromQuery<Lesson>(lessonsSnap)),
  };
}

export async function fetchLessonVideoUrl(lessonId: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'lesson_media', lessonId));
    if (!snap.exists()) return null;
    const url = snap.data().video_url;
    return typeof url === 'string' && url ? url : null;
  } catch (err) {
    if (isPermissionDenied(err)) throw new Error('Enroll in this course to watch this recording.');
    throw err;
  }
}
