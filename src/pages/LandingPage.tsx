import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { BookOpen, Star, Phone, Search, Loader2, Clock } from 'lucide-react';
import { CourseCard } from '@/components/catalog/CourseCard';
import { Alert } from '@/components/ui/Feedback';
import { useAuth } from '@/context/AuthContext';
import { fetchCourses } from '@/lib/api/catalog';
import { enrollInCourse, fetchMyEnrollments } from '@/lib/api/learning';
import { useAsync } from '@/hooks/useAsync';
import { navigate } from '@/lib/router';
import { errorMessage } from '@/lib/errors';
import type { Course } from '@/lib/types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const HERO_IMAGE = 'https://images.pexels.com/photos/28857560/pexels-photo-28857560.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

export function LandingPage() {
  const { user } = useAuth();
  const courses = useAsync(fetchCourses, []);
  const enrollments = useAsync(() => fetchMyEnrollments(user?.uid ?? ''), [user?.uid], Boolean(user));
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const enrolledIds = useMemo(() => new Set((enrollments.data ?? []).map((e) => e.course_id)), [enrollments.data]);

  // Phone Number Quick Access State
  const [searchPhone, setSearchPhone] = useState('');
  const [searchingPhone, setSearchingPhone] = useState(false);
  const [phoneSearchError, setPhoneSearchError] = useState<string | null>(null);

  const featured: Course[] = (courses.data ?? []).slice(0, 3);
  const totalHours = (courses.data ?? []).reduce((sum, c) => sum + c.duration_hours, 0);

  const handleEnroll = async (course: Course) => {
    if (!user) {
      navigate('/signin');
      return;
    }
    if (enrolledIds.has(course.id)) {
      navigate(`/learn/${course.slug}`);
      return;
    }
    setEnrollError(null);
    setEnrollingId(course.id);
    try {
      await enrollInCourse(user.uid, course);
      navigate(`/learn/${course.slug}`);
    } catch (err) {
      setEnrollError(errorMessage(err, 'We could not enroll you. Please try again.'));
    } finally {
      setEnrollingId(null);
    }
  };

  // Strict Verification: Check if phone number exists in preSessionViewers or registeredStudents
  const handlePhoneQuickAccess = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) {
      return setPhoneSearchError('කරුණාකර ඔබේ දුරකථන අංකය ඇතුළත් කරන්න.');
    }

    setSearchingPhone(true);
    setPhoneSearchError(null);

    try {
      const snap = await getDocs(collection(db, 'classrooms'));
      let foundClassroomId: string | null = null;
      const cleanInputPhone = searchPhone.trim().replace(/\s+/g, ''); // Remove spaces

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        
        // 1. Check in registered students
        const registeredStudents = data.registeredStudents || [];
        const isRegistered = registeredStudents.some(
          (s: any) => s.phone?.trim().replace(/\s+/g, '') === cleanInputPhone || s.whatsapp?.trim().replace(/\s+/g, '') === cleanInputPhone
        );

        // 2. Check in pre-session viewers
        const preSessionViewers = data.preSessionViewers || [];
        const isViewer = preSessionViewers.some(
          (v: any) => v.phone?.trim().replace(/\s+/g, '') === cleanInputPhone
        );

        if (isRegistered || isViewer) {
          foundClassroomId = docSnap.id;
        }
      });

      if (foundClassroomId) {
        // Set session token so classroom page bypasses login gate on this device
        sessionStorage.setItem(`student_session_${foundClassroomId}`, cleanInputPhone);
        navigate(`/classroom/${foundClassroomId}`);
      } else {
        setPhoneSearchError('මෙම දුරකථන අංකය සමඟ කිසිදු ලියාපදිංචියක් හෝ ප්‍රී-සෙෂන් ප්‍රවේශයක් හමු නොවීය. කරුණාකර පළමුව අප විසින් එවූ නිල ලින්ක් එක හරහා ගොස් නම සහ දුරකථන අංකය ලබා දී ඇතුළු වන්න.');
      }
    } catch (err) {
      setPhoneSearchError(errorMessage(err, 'පරීක්ෂා කිරීමේදී දෝෂයක් ඇති විය. කරුණාකර නැවත උත්සාහ කරන්න.'));
    } finally {
      setSearchingPhone(false);
    }
  };

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-navy-950">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy-950 via-navy-900/90 to-navy-800/80" />
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-36 sm:px-6 lg:px-8 lg:pt-44">
          <div className="max-w-2xl animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Wealth Doctor Institute
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Learn to grow and protect your wealth.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-navy-200 sm:text-lg">
              Practical courses in stock market investing and personal finance, taught by certified professionals. Learn at your
              own pace, with recorded lessons and notes for every module.
            </p>

            {/* QUICK PHONE NUMBER ACCESS BOX */}
            <div className="mt-8 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 max-w-lg shadow-xl space-y-3">
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">රෙකෝඩින් නැරබීම සඳහා (Enter Phone Number):</p>
              <form onSubmit={handlePhoneQuickAccess} className="flex flex-col gap-3">
                <div className="relative flex-1">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    className="w-full bg-white/90 text-navy-900 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    placeholder="Enter Phone Number (උදා: 0771234567)"
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={searchingPhone} className="btn-primary shrink-0 px-8 py-2.5 text-sm font-bold flex items-center gap-2 shadow-md">
                    {searchingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {searchingPhone ? 'පරීක්ෂා කරමින්...' : 'Go'}
                  </button>
                </div>
              </form>
              {phoneSearchError && <p className="text-xs text-rose-300 font-medium leading-relaxed">{phoneSearchError}</p>}
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-8">
              <Stat icon={<BookOpen className="h-4 w-4" />} label="Courses" value={String(courses.data?.length ?? 0)} />
              <Stat icon={<Clock className="h-4 w-4" />} label="Hours of video" value={`${Math.round(totalHours)}+`} />
              <Stat icon={<Star className="h-4 w-4" />} label="Average rating" value={averageRating(courses.data ?? [])} />
            </dl>
          </div>
        </div>
      </section>

      <section id="courses" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Featured courses</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-navy-900">Start with the fundamentals</h2>
              <p className="mt-2 max-w-xl text-navy-500">Hands-on lessons designed to take you from first principles to confident decisions.</p>
            </div>
          </div>

          {enrollError && (
            <div className="mt-6">
              <Alert tone="error">{enrollError}</Alert>
            </div>
          )}

          {courses.loading && <p className="mt-10 text-sm text-navy-500">Loading courses...</p>}
          {courses.error && (
            <div className="mt-10">
              <Alert tone="error">We could not load the courses right now. {courses.error}</Alert>
            </div>
          )}
          {courses.data && featured.length === 0 && (
            <p className="mt-10 text-sm text-navy-500">New courses are on the way. Check back soon.</p>
          )}

          <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {featured.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                enrolled={enrolledIds.has(course.id)}
                busy={enrollingId === course.id}
                onEnroll={() => handleEnroll(course)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function averageRating(courses: Course[]): string {
  if (courses.length === 0) return '-';
  return (courses.reduce((sum, c) => sum + c.rating, 0) / courses.length).toFixed(1);
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-navy-300">
        {icon} {label}
      </dt>
      <dd className="mt-1 text-2xl font-extrabold text-white">{value}</dd>
    </div>
  );
}
