import { useState, useEffect } from 'react';
import { BookOpen, PlayCircle, User, Edit3, CheckCircle2, Calendar, Timer, Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/Feedback';
import { useAuth } from '@/context/AuthContext';
import { navigate } from '@/lib/router';
import { doc, getDocs, collection, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface EnrolledClassroom {
  id: string;
  courseName: string;
  batchNumber: string;
  courseFee: string;
  paymentStatus: string;
}

export function DashboardPage() {
  const { user, profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  const [enrolledClassrooms, setEnrolledClassrooms] = useState<EnrolledClassroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);

  // Full Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [profileData, setProfileData] = useState({
    fullName: profile?.full_name || '',
    title: 'Mr' as 'Mr' | 'Mrs' | 'Miss' | 'Dr',
    maritalStatus: 'Unmarried' as 'Married' | 'Unmarried',
    dob: '',
    address: '',
    nic: '',
    phone: '',
    whatsapp: '',
    email: user?.email || '',
    occupation: '',
    investmentGoal: '',
    username: '',
  });

  useEffect(() => {
    async function fetchStudentData() {
      if (!user?.email) {
        setLoadingClassrooms(false);
        return;
      }
      try {
        const snap = await getDocs(collection(db, 'classrooms'));
        const matchedClassrooms: EnrolledClassroom[] = [];

        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const students = data.registeredStudents || [];
          
          // Find student record matching current user email to pre-fill profile form
          const matchedStudent = students.find((s: any) => s.email?.toLowerCase() === user.email?.toLowerCase());
          if (matchedStudent) {
            setProfileData({
              fullName: matchedStudent.fullName || profile?.full_name || '',
              title: matchedStudent.title || 'Mr',
              maritalStatus: matchedStudent.maritalStatus || 'Unmarried',
              dob: matchedStudent.dob || '',
              address: matchedStudent.address || '',
              nic: matchedStudent.nic || '',
              phone: matchedStudent.phone || '',
              whatsapp: matchedStudent.whatsapp || '',
              email: matchedStudent.email || user.email || '',
              occupation: matchedStudent.occupation || '',
              investmentGoal: matchedStudent.investmentGoal || '',
              username: matchedStudent.username || '',
            });
          }

          const isRegistered = students.some((s: any) => s.email?.toLowerCase() === user.email?.toLowerCase());
          if (isRegistered) {
            matchedClassrooms.push({
              id: docSnap.id,
              courseName: data.courseName || 'Stock Market Course',
              batchNumber: data.batchNumber || 'N/A',
              courseFee: data.courseFee || 'Free',
              paymentStatus: 'Paid & Verified',
            });
          }
        });

        setEnrolledClassrooms(matchedClassrooms);
      } catch (err) {
        console.error('Error fetching student classrooms:', err);
      } finally {
        setLoadingClassrooms(false);
      }
    }
    fetchStudentData();
  }, [user, profile]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProfile(true);
    setProfileSuccess(null);

    try {
      // Update student profile in all enrolled classrooms where this email exists
      const snap = await getDocs(collection(db, 'classrooms'));
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const students = data.registeredStudents || [];
        const studentIndex = students.findIndex((s: any) => s.email?.toLowerCase() === user?.email?.toLowerCase());

        if (studentIndex !== -1) {
          students[studentIndex] = {
            ...students[studentIndex],
            ...profileData,
          };
          const docRef = doc(db, 'classrooms', docSnap.id);
          await updateDoc(docRef, { registeredStudents: students });
        }
      }

      setProfileSuccess('ප්‍රොෆයිල් විස්තර සාර්ථකව යාවත්කාලීන කරන ලදී!');
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSubmittingProfile(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8 space-y-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Student Dashboard</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-navy-900">Welcome back, {firstName}!</h1>
          <p className="mt-1 text-navy-500 text-sm">ඔබ ලියාපදිංචි වී ඇති පන්ති කාමර සහ ඔබේ පෞද්ගලික ප්‍රොෆයිල් විස්තර කළමනාකරණය.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditingProfile(!isEditingProfile)}
          className="btn-secondary text-xs py-2.5 px-4 w-max flex items-center gap-1.5 shadow-sm"
        >
          <Edit3 className="w-4 h-4 text-emerald-600" /> {isEditingProfile ? 'Close Profile Edit' : 'Edit Full Profile (ප්‍රොෆයිලය වෙනස් කරන්න)'}
        </button>
      </div>

      {profileSuccess && <Alert tone="success">{profileSuccess}</Alert>}

      {/* FULL REGISTRATION PROFILE EDIT SECTION */}
      {isEditingProfile && (
        <div className="bg-emerald-50/70 rounded-3xl border border-emerald-200 p-6 sm:p-8 shadow-sm space-y-6 animate-slide-up">
          <div className="flex items-center gap-2 border-b border-emerald-200 pb-3">
            <User className="w-6 h-6 text-emerald-700" />
            <div>
              <h3 className="text-lg font-extrabold text-navy-900">Student Full Profile Management (ලියාපදිංචි දත්ත සංස්කරණය)</h3>
              <p className="text-xs text-gray-600">ඔබ පාඨමාලාවට ඇතුළත් වන විට ලබා දුන් සියලුම විස්තර මෙහිදී සංස්කරණය කර සේව් කරගත හැක.</p>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-emerald-100">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Username (යූසර් නේම්)</label>
                <input
                  className="input mt-1 bg-gray-50 font-mono text-xs"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label text-xs font-semibold text-gray-700">Email Address (වෙනස් කළ නොහැක)</label>
                <input
                  type="email"
                  className="input mt-1 bg-gray-100 text-gray-500 cursor-not-allowed text-xs"
                  value={profileData.email}
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Title</label>
                <select
                  className="input mt-1 bg-white text-xs"
                  value={profileData.title}
                  onChange={(e) => setProfileData({ ...profileData, title: e.target.value as any })}
                >
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Miss">Miss</option>
                  <option value="Dr">Dr</option>
                </select>
              </div>
              <div>
                <label className="label text-xs font-semibold text-gray-700">Marital Status</label>
                <select
                  className="input mt-1 bg-white text-xs"
                  value={profileData.maritalStatus}
                  onChange={(e) => setProfileData({ ...profileData, maritalStatus: e.target.value as any })}
                >
                  <option value="Unmarried">Unmarried</option>
                  <option value="Married">Married</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label text-xs font-semibold text-gray-700">Full Name (සම්පූර්ණ නම)</label>
              <input
                className="input mt-1 bg-white text-xs"
                value={profileData.fullName}
                onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Date of Birth (උපන් දිනය)</label>
                <input
                  type="date"
                  className="input mt-1 bg-white text-xs"
                  value={profileData.dob}
                  onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label text-xs font-semibold text-gray-700">National ID (NIC / විදේශ ගමන් බලපත්‍ර අංකය)</label>
                <input
                  className="input mt-1 bg-white text-xs"
                  value={profileData.nic}
                  onChange={(e) => setProfileData({ ...profileData, nic: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label text-xs font-semibold text-gray-700">Residential Address (ලිපිනය)</label>
              <textarea
                rows={2}
                className="input mt-1 resize-none bg-white text-xs"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Phone Number (දුරකථන අංකය)</label>
                <input
                  type="tel"
                  className="input mt-1 bg-white text-xs"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label text-xs font-semibold text-gray-700">WhatsApp Number</label>
                <input
                  type="tel"
                  className="input mt-1 bg-white text-xs"
                  value={profileData.whatsapp}
                  onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Current Occupation (වෘත්තිය)</label>
                <input
                  className="input mt-1 bg-white text-xs"
                  value={profileData.occupation}
                  onChange={(e) => setProfileData({ ...profileData, occupation: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label text-xs font-semibold text-gray-700">Investment Goal / Purpose (ආයෝජන අරමුණ)</label>
                <input
                  className="input mt-1 bg-white text-xs"
                  value={profileData.investmentGoal}
                  onChange={(e) => setProfileData({ ...profileData, investmentGoal: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-emerald-200">
              <button type="button" onClick={() => setIsEditingProfile(false)} className="btn-secondary text-xs px-6 py-2.5">
                Cancel
              </button>
              <button type="submit" disabled={submittingProfile} className="btn-primary text-xs px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700">
                {submittingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ENROLLED CLASSROOMS & COURSES SECTION */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-navy-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" /> My Enrolled Classrooms & Courses (මගේ පාඨමාලා සහ පන්ති)
          </h2>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
            {enrolledClassrooms.length} Active Classes
          </span>
        </div>

        {loadingClassrooms ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : enrolledClassrooms.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-navy-900">තවම කිසිදු පන්ති කාමරයක ලියාපදිංචි වී නැත</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              ඔබ තවමත් කිසිදු බැච් එකක් හෝ පාඨමා඲ාවක් සඳහා රහස් කේතය (Access Code) මඟින් ලියාපදිංචි වී නැත.
            </p>
            <a href="#/" className="btn-primary inline-flex mt-2 text-xs py-2.5 px-6">
              Browse Home & Classes
            </a>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {enrolledClassrooms.map((cls) => (
              <div key={cls.id} className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between space-y-6 transition hover:shadow-md">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                      Batch: {cls.batchNumber}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {cls.paymentStatus}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-navy-900">{cls.courseName}</h3>
                  
                  <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <p><strong>Course Fee:</strong> {cls.courseFee}</p>
                    <p><strong>Classroom ID:</strong> <span className="font-mono text-indigo-600">{cls.id}</span></p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-mono">Access Code Verified</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/classroom/${cls.id}`)}
                    className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 shadow"
                  >
                    <PlayCircle className="w-4 h-4" /> Go to Classroom ({cls.batchNumber})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
