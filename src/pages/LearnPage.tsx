import { useMemo, useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { CurriculumSidebar } from '@/components/learn/CurriculumSidebar';
import { VideoPlayer } from '@/components/learn/VideoPlayer';
import { NotesPanel } from '@/components/learn/NotesPanel';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { useAuth } from '@/context/AuthContext';
import { fetchCourseBySlug, fetchCurriculum } from '@/lib/api/catalog';
import { enrollInCourse, fetchCompletedLessonIds, fetchMyEnrollment, setLessonCompleted } from '@/lib/api/learning';
import { useAsync } from '@/hooks/useAsync';
import { navigate } from '@/lib/router';
import { errorMessage } from '@/lib/errors';
import type { Lesson } from '@/lib/types';

interface LearnPageProps {
  slug: string;
  lessonId: string | null;
}

export function LearnPage({ slug, lessonId }: LearnPageProps) {
  const { user, isAdmin } = useAuth();
  const course = useAsync(() => fetchCourseBySlug(slug), [slug]);
  const courseId = course.data?.id;
  const enrollment = useAsync(
    () => fetchMyEnrollment(user!.uid, courseId!),
    [courseId, user?.uid],
    Boolean(courseId && user),
  );
  const hasAccess = Boolean(enrollment.data) || isAdmin;
  const curriculum = useAsync(() => fetchCurriculum(courseId!), [courseId], Boolean(courseId && hasAccess));
  const progress = useAsync(() => fetchCompletedLessonIds(user!.uid, courseId!), [courseId, user?.uid], Boolean(courseId && user && hasAccess));

  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [progressSynced, setProgressSynced] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  if (progress.data && !progressSynced) {
    setCompleted(new Set(progress.data));
    setProgressSynced(true);
  }

  const lessons: Lesson[] = curriculum.data?.lessons ?? [];
  const selected = useMemo<Lesson | null>(() => {
    if (lessons.length === 0) return null;
    return lessons.find((l) => l.id === lessonId) ?? lessons[0];
  }, [lessons, lessonId]);

  const selectLesson = (id: string) => navigate(`/learn/${slug}?lesson=${id}`);

  const toggleComplete = async (lesson: Lesson) => {
    if (!user || !courseId) return;
    const next = !completed.has(lesson.id);
    setActionError(null);
    setCompleted((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(lesson.id);
      else copy.delete(lesson.id);
      return copy;
    });
    try {
      await setLessonCompleted(user.uid, courseId, lesson.id, next);
    } catch (err) {
      setCompleted((prev) => {
        const copy = new Set(prev);
        if (next) copy.delete(lesson.id);
        else copy.add(lesson.id);
        return copy;
      });
      setActionError(errorMessage(err, 'We could not save your progress. Please try again.'));
    }
  };

  const handleEnroll = async () => {
    if (!user || !course.data) return;
    setEnrolling(true);
    setActionError(null);
    try {
      await enrollInCourse(user.uid, course.data);
      enrollment.reload();
    } catch (err) {
      setActionError(errorMessage(err, 'Enrollment failed. Please try again.'));
    } finally {
      setEnrolling(false);
    }
  };

  if (course.loading || (courseId && enrollment.loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Opening your course" />
      </div>
    );
  }

  if (course.error || enrollment.error) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-32">
        <Alert tone="error">We could not open this course. {course.error ?? enrollment.error}</Alert>
      </div>
    );
  }

  if (!course.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-32 text-center">
        <h1 className="text-2xl font-bold text-navy-900">Course not found</h1>
        <a href="#/" className="btn-primary mt-6">Back to courses</a>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
        <div className="card max-w-md p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
            <Lock className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-xl font-bold text-navy-900">{course.data.title}</h1>
          <p className="mt-2 text-sm text-navy-500">Enroll to unlock all lessons, notes, and course materials.</p>
          {actionError && <div className="mt-4"><Alert tone="error">{actionError}</Alert></div>}
          <button type="button" onClick={handleEnroll} disabled={enrolling} className="btn-primary mt-6 w-full py-3">
            {enrolling ? 'Enrolling...' : `Enroll for ${(course.data.price_cents / 100).toFixed(0)} USD`}
          </button>
          <a href="#/dashboard" className="btn-ghost mt-3">Back to dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-navy-50 lg:h-screen">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-navy-100 bg-white px-4 sm:px-6">
        <a href="#/dashboard" className="btn-ghost px-2" aria-label="Back to dashboard">
          <ArrowLeft className="h-5 w-5" />
        </a>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-emerald-600">Now learning</p>
          <h1 className="truncate text-sm font-bold text-navy-900 sm:text-base">{course.data.title}</h1>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {curriculum.loading || !curriculum.data ? (
          <div className="flex flex-1 items-center justify-center p-10">
            {curriculum.error ? <Alert tone="error">{curriculum.error}</Alert> : <Spinner label="Loading lessons" />}
          </div>
        ) : (
          <>
            <CurriculumSidebar
              modules={curriculum.data.modules}
              lessons={lessons}
              selectedId={selected?.id ?? null}
              completed={completed}
              onSelect={selectLesson}
            />
            <main className="min-w-0 flex-1 overflow-y-auto">
              {actionError && <div className="px-4 pt-4 sm:px-8"><Alert tone="error">{actionError}</Alert></div>}
              {selected ? (
                <LessonView
                  key={selected.id}
                  lesson={selected}
                  courseId={courseId!}
                  isDone={completed.has(selected.id)}
                  onToggleDone={() => toggleComplete(selected)}
                />
              ) : (
                <p className="p-10 text-sm text-navy-500">This course has no lessons yet.</p>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}

interface LessonViewProps {
  lesson: Lesson;
  courseId: string;
  isDone: boolean;
  onToggleDone: () => void;
}

function LessonView({ lesson, courseId, isDone, onToggleDone }: LessonViewProps) {
  const { user } = useAuth();
  const [timeSeconds, setTimeSeconds] = useState(0);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-8">
      <VideoPlayer lessonId={lesson.id} title={lesson.title} onTimeChange={setTimeSeconds} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-navy-900">{lesson.title}</h2>
          <p className="mt-2 max-w-3xl leading-relaxed text-navy-500">{lesson.description}</p>
        </div>
        <button
          type="button"
          onClick={onToggleDone}
          aria-pressed={isDone}
          className={isDone ? 'btn-secondary shrink-0 border-emerald-200 text-emerald-700' : 'btn-primary shrink-0'}
        >
          {isDone ? 'Completed' : 'Mark as complete'}
        </button>
      </div>

      {user && <NotesPanel lessonId={lesson.id} courseId={courseId} userId={user.uid} currentSeconds={timeSeconds} />}
    </div>
  );
}
