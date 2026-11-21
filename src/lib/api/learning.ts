import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { rowFromDoc, rowsFromQuery } from '@/lib/firestore';
import type { Course, Enrollment, EnrollmentWithCourse, LessonNote } from '@/lib/types';

const enrollmentDocId = (userId: string, courseId: string) => `${userId}_${courseId}`;

interface ProgressRow {
  lesson_id: string;
}

export async function fetchMyEnrollments(userId: string): Promise<EnrollmentWithCourse[]> {
  const snap = await getDocs(
    query(collection(db, 'enrollments'), where('user_id', '==', userId), where('status', '==', 'active')),
  );
  const enrollments = rowsFromQuery<Enrollment>(snap);
  const courseSnaps = await Promise.all(enrollments.map((e) => getDoc(doc(db, 'courses', e.course_id))));
  return enrollments
    .map((enrollment, i) => ({
      ...enrollment,
      courses: courseSnaps[i].exists() ? rowFromDoc<Course>(courseSnaps[i]) : null,
    }))
    .sort((a, b) => b.enrolled_at.localeCompare(a.enrolled_at));
}

export async function fetchMyEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  const snap = await getDoc(doc(db, 'enrollments', enrollmentDocId(userId, courseId)));
  if (!snap.exists()) return null;
  const row = rowFromDoc<Enrollment>(snap);
  return row.status === 'active' ? row : null;
}

export async function enrollInCourse(userId: string, course: Course): Promise<void> {
  await setDoc(doc(db, 'enrollments', enrollmentDocId(userId, course.id)), {
    user_id: userId,
    course_id: course.id,
    status: 'active',
    price_paid_cents: course.price_cents,
    enrolled_at: new Date().toISOString(),
  });
}

export async function fetchCompletedLessonIds(userId: string, courseId: string): Promise<string[]> {
  const snap = await getDocs(
    query(
      collection(db, 'lesson_progress'),
      where('user_id', '==', userId),
      where('course_id', '==', courseId),
      where('completed', '==', true),
    ),
  );
  return rowsFromQuery<ProgressRow>(snap).map((row) => row.lesson_id);
}

export async function setLessonCompleted(userId: string, courseId: string, lessonId: string, completed: boolean): Promise<void> {
  const now = new Date().toISOString();
  await setDoc(
    doc(db, 'lesson_progress', `${userId}_${lessonId}`),
    {
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      completed,
      completed_at: completed ? now : null,
      updated_at: now,
    },
    { merge: true },
  );
}

export async function fetchLessonNotes(userId: string, lessonId: string): Promise<LessonNote[]> {
  const snap = await getDocs(
    query(collection(db, 'lesson_notes'), where('user_id', '==', userId), where('lesson_id', '==', lessonId)),
  );
  return rowsFromQuery<LessonNote>(snap).sort((a, b) => a.video_seconds - b.video_seconds);
}

export async function addLessonNote(userId: string, courseId: string, lessonId: string, body: string, videoSeconds: number): Promise<void> {
  await addDoc(collection(db, 'lesson_notes'), {
    user_id: userId,
    course_id: courseId,
    lesson_id: lessonId,
    body,
    video_seconds: Math.floor(videoSeconds),
    created_at: new Date().toISOString(),
  });
}
