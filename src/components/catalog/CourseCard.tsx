import { Clock, Star, Users } from 'lucide-react';
import { CATEGORY_LABELS, type Course } from '@/lib/types';
import { formatHours, formatPrice } from '@/lib/format';

interface CourseCardProps {
  course: Course;
  enrolled: boolean;
  busy: boolean;
  onEnroll: () => void;
}

export function CourseCard({ course, enrolled, busy, onEnroll }: CourseCardProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img src={course.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-navy-800 shadow-sm">
          {CATEGORY_LABELS[course.category]}
        </span>
        {enrolled && (
          <span className="absolute right-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            Enrolled
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-navy-500">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-navy-800">{course.rating.toFixed(1)}</span>
            <span className="text-navy-400">({course.review_count.toLocaleString()})</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {formatHours(course.duration_hours)}
          </span>
          <span>{course.level}</span>
        </div>

        <h3 className="mt-3 text-lg font-bold leading-snug text-navy-900">{course.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-navy-500">{course.subtitle}</p>

        <div className="mt-4 flex items-center gap-2 text-sm text-navy-600">
          <Users className="h-4 w-4 text-navy-400" />
          <span>
            {course.instructor_name} <span className="text-navy-400">· {course.instructor_title}</span>
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-navy-100 pt-5">
          <span className="text-2xl font-extrabold text-navy-900">{formatPrice(course.price_cents)}</span>
          <button type="button" onClick={onEnroll} disabled={busy} className="btn-primary px-4 py-2">
            {busy ? 'Enrolling...' : enrolled ? 'Continue' : 'Enroll now'}
          </button>
        </div>
      </div>
    </article>
  );
}
