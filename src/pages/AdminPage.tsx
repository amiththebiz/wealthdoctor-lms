import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Database, Link2, Loader2, Upload, FileText, Image as ImageIcon, BookOpen, ShieldCheck, Globe, PlusCircle, CheckCircle2, Users, Calendar, Clock, DollarSign, Edit3, Trash2, Copy, Check, X, ExternalLink, Key } from 'lucide-react';
import { Alert } from '@/components/ui/Feedback';
import { createLesson } from '@/lib/api/admin';
import { fetchAllCourses, fetchCurriculum } from '@/lib/api/catalog';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/errors';
import { seedSampleCatalog } from '@/lib/seed/sampleCatalog';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { navigate } from '@/lib/router';

interface ClassroomItem {
  id: string;
  courseId: string;
  courseName: string;
  batchNumber: string;
  courseDates: string[];
  courseTime: string;
  courseFee: string;
  accessCode: string;
  preSessionVideo: string;
  registeredStudents?: Array<{ fullName: string; email: string; username?: string; phone?: string; nic?: string; registeredDate?: string }>;
  paidStudents?: Array<{ name: string; email: string; date: string; amount: string }>;
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classrooms' | 'courses' | 'lessons' | 'content' | 'branding'>('dashboard');

  // Courses Management State
  const courses = useAsync(fetchAllCourses, []);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [creatingModule, setCreatingModule] = useState(false);

  // Classroom Management State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [courseDates, setCourseDates] = useState<string[]>(['']);
  const [courseTime, setCourseTime] = useState('');
  const [courseFee, setCourseFee] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [preSessionVideoUrl, setPreSessionVideoUrl] = useState('');
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeModalClassroom, setActiveModalClassroom] = useState<ClassroomItem | null>(null);
  const [modalTab, setModalTab] = useState<'registered' | 'paid'>('registered');
  const [classroomLoading, setClassroomLoading] = useState(false);
  const [classroomError, setClassroomError] = useState<string | null>(null);
  const [classroomSuccess, setClassroomSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lessons State
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('10');
  const [isPreview, setIsPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Web Content & Branding State
  const [siteTitle, setSiteTitle] = useState('Wealth Doctor');
  const [heroHeading, setHeroHeading] = useState('Your path to financial confidence starts here.');
  const [heroSubtext, setHeroSubtext] = useState('Join thousands of students learning investing and personal finance from certified instructors.');
  const [logoUrl, setLogoUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  const curriculum = useAsync(
    () => fetchCurriculum(courseId),
    [courseId],
    Boolean(courseId),
  );

  const fetchClassrooms = async () => {
    try {
      const snap = await getDocs(collection(db, 'classrooms'));
      const list: ClassroomItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          courseId: data.courseId || '',
          courseName: data.courseName || 'General Course',
          batchNumber: data.batchNumber || 'N/A',
          courseDates: data.courseDates || [],
          courseTime: data.courseTime || 'N/A',
          courseFee: data.courseFee || 'Free',
          accessCode: data.accessCode || 'WD-' + Math.floor(1000 + Math.random() * 9000),
          preSessionVideo: data.preSessionVideo || '',
          registeredStudents: data.registeredStudents || [],
          paidStudents: data.paidStudents || [],
        };
      });
      setClassrooms(list);
    } catch (err) {
      console.error('Error fetching classrooms:', err);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    if (!courseId && courses.data?.[0]) setCourseId(courses.data[0].id);
  }, [courses.data, courseId]);

  useEffect(() => {
    setModuleId(curriculum.data?.modules[0]?.id ?? '');
  }, [curriculum.data]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'site_config'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.siteTitle) setSiteTitle(data.siteTitle);
          if (data.heroHeading) setHeroHeading(data.heroHeading);
          if (data.heroSubtext) setHeroSubtext(data.heroSubtext);
          if (data.logoUrl) setLogoUrl(data.logoUrl);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    }
    loadSettings();
  }, []);

  const handleDateChange = (index: number, value: string) => {
    const updatedDates = [...courseDates];
    updatedDates[index] = value;
    setCourseDates(updatedDates);
  };

  const addDateRow = () => {
    setCourseDates([...courseDates, '']);
  };

  const removeDateRow = (index: number) => {
    const updatedDates = courseDates.filter((_, i) => i !== index);
    setCourseDates(updatedDates.length ? updatedDates : ['']);
  };

  const generateRandomCode = () => {
    const code = 'WD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setAccessCode(code);
  };

  const handleSubmitClassroom = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return setClassroomError('Please select a course from the dropdown.');
    if (!batchNumber.trim()) return setClassroomError('Enter classroom / batch number.');
    if (!accessCode.trim()) return setClassroomError('Please enter or generate a payment access code.');

    setClassroomLoading(true);
    setClassroomError(null);
    setClassroomSuccess(null);

    const selectedCourse = courses.data?.find((c) => c.id === selectedCourseId);
    const courseName = selectedCourse ? selectedCourse.title : 'General Course';
    const validDates = courseDates.filter((d) => d.trim() !== '');

    try {
      if (editingId) {
        const docRef = doc(db, 'classrooms', editingId);
        await updateDoc(docRef, {
          courseId: selectedCourseId,
          courseName,
          batchNumber: batchNumber.trim(),
          courseDates: validDates,
          courseTime: courseTime.trim(),
          courseFee: courseFee.trim(),
          accessCode: accessCode.trim(),
          preSessionVideo: preSessionVideoUrl.trim(),
          updated_at: new Date().toISOString(),
        });
        setClassroomSuccess(`Classroom / Batch ${batchNumber} updated successfully!`);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'classrooms'), {
          courseId: selectedCourseId,
          courseName,
          batchNumber: batchNumber.trim(),
          courseDates: validDates,
          courseTime: courseTime.trim(),
          courseFee: courseFee.trim(),
          accessCode: accessCode.trim(),
          preSessionVideo: preSessionVideoUrl.trim(),
          registeredStudents: [],
          paidStudents: [],
          created_at: new Date().toISOString(),
        });
        setClassroomSuccess(`Classroom / Batch ${batchNumber} created successfully!`);
      }

      setSelectedCourseId('');
      setBatchNumber('');
      setCourseDates(['']);
      setCourseTime('');
      setCourseFee('');
      setAccessCode('');
      setPreSessionVideoUrl('');
      fetchClassrooms();
    } catch (err) {
      setClassroomError(errorMessage(err, 'Failed to save classroom.'));
    } finally {
      setClassroomLoading(false);
    }
  };

  const handleEdit = (item: ClassroomItem) => {
    setEditingId(item.id);
    setSelectedCourseId(item.courseId || '');
    setBatchNumber(item.batchNumber || '');
    setCourseDates(item.courseDates?.length ? item.courseDates : ['']);
    setCourseTime(item.courseTime || '');
    setCourseFee(item.courseFee || '');
    setAccessCode(item.accessCode || '');
    setPreSessionVideoUrl(item.preSessionVideo || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClassroom = async (id: string) => {
    if (!confirm('Are you sure you want to delete this classroom?')) return;
    try {
      await deleteDoc(doc(db, 'classrooms', id));
      setClassroomSuccess('Classroom deleted successfully.');
      fetchClassrooms();
    } catch (err) {
      setClassroomError(errorMessage(err, 'Failed to delete classroom.'));
    }
  };

  const handleCopyLink = (id: string) => {
    const link = `${window.location.origin}/#/classroom/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatus = (dates: string[]) => {
    if (!dates || dates.length === 0) return { label: 'Ongoing', color: 'bg-emerald-100 text-emerald-700' };
    const today = new Date().toISOString().split('T')[0];
    const lastDate = [...dates].sort().reverse()[0];
    if (lastDate && lastDate < today) {
      return { label: 'Ended', color: 'bg-gray-100 text-gray-600' };
    }
    return { label: 'Ongoing', color: 'bg-emerald-100 text-emerald-700' };
  };

  const handleCreateCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return setError('Enter a course title.');
    setCreatingCourse(true);
    setError(null);
    setSuccess(null);
    try {
      await addDoc(collection(db, 'courses'), {
        title: newCourseTitle.trim(),
        description: newCourseDesc.trim(),
        created_at: new Date().toISOString(),
      });
      setSuccess('New course created successfully!');
      setNewCourseTitle('');
      setNewCourseDesc('');
      courses.reload();
    } catch (err) {
      setError(errorMessage(err, 'Failed to create course.'));
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleCreateModule = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseId) return setError('Select a course first.');
    if (!newModuleTitle.trim()) return setError('Enter a module title.');
    setCreatingModule(true);
    setError(null);
    setSuccess(null);
    try {
      const modulesList = curriculum.data?.modules ?? [];
      const position = modulesList.length + 1;
      await addDoc(collection(db, `courses/${courseId}/modules`), {
        title: newModuleTitle.trim(),
        position,
        created_at: new Date().toISOString(),
      });
      setSuccess('New module added to the course successfully!');
      setNewModuleTitle('');
      curriculum.reload();
    } catch (err) {
      setError(errorMessage(err, 'Failed to create module.'));
    } finally {
      setCreatingModule(false);
    }
  };

  const onSeed = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      await seedSampleCatalog();
      courses.reload();
    } catch (err) {
      setSeedError(errorMessage(err, 'The sample courses could not be loaded.'));
    } finally {
      setSeeding(false);
    }
  };

  const onSubmitLesson = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedTitle = title.trim();
    const trimmedUrl = videoUrl.trim();
    const minutes = Number(duration);

    if (!courseId) return setError('Choose a course first.');
    if (!moduleId) return setError('Choose a module for this lesson.');
    if (!trimmedTitle) return setError('Enter a lesson title.');
    if (trimmedUrl && !/^https?:\/\/\S+$/i.test(trimmedUrl)) return setError('The video link must start with http:// or https://.');
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) return setError('Duration must be a whole number of minutes between 1 and 600.');

    const lessons = curriculum.data?.lessons ?? [];
    const position = lessons.reduce((max, l) => Math.max(max, l.position), 0) + 1;

    setSubmitting(true);
    try {
      await createLesson({
        course_id: courseId,
        module_id: moduleId,
        title: trimmedTitle,
        description: description.trim(),
        video_url: trimmedUrl,
        duration_minutes: minutes,
        position,
        is_preview: isPreview,
      });
      setSuccess(`"${trimmedTitle}" lesson was added successfully.`);
      setTitle('');
      setDescription('');
      setVideoUrl('');
      curriculum.reload();
    } catch (err) {
      setError(errorMessage(err, 'The lesson could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError('Image file is too large. Please select an image under 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const onSaveSettings = async (event: FormEvent) => {
    event.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(null);
    setError(null);
    try {
      await setDoc(doc(db, 'settings', 'site_config'), {
        siteTitle,
        heroHeading,
        heroSubtext,
        logoUrl,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      setSettingsSuccess('Settings and logo saved successfully! Refresh home page to view updates.');
    } catch (err) {
      setError(errorMessage(err, 'Failed to save settings.'));
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Control Center
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy-900">Wealth Doctor Management</h1>
          <p className="mt-1 text-sm text-navy-500">Manage classrooms, courses, lessons, logo and website texts.</p>
        </div>
        <a href="#/" className="btn-secondary text-sm inline-flex items-center gap-2 self-start">
          <Globe className="w-4 h-4" /> View Live Website
        </a>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-8">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
            activeTab === 'dashboard' ? 'border-emerald-600 bg-emerald-50/50 shadow-sm' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700"><ShieldCheck className="w-4 h-4" /></div>
          <div><p className="font-bold text-navy-900 text-xs">Overview</p></div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('classrooms')}
          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
            activeTab === 'classrooms' ? 'border-emerald-600 bg-emerald-50/50 shadow-sm' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700"><Users className="w-4 h-4" /></div>
          <div><p className="font-bold text-navy-900 text-xs">Classrooms</p></div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('courses')}
          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
            activeTab === 'courses' ? 'border-emerald-600 bg-emerald-50/50 shadow-sm' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700"><PlusCircle className="w-4 h-4" /></div>
          <div><p className="font-bold text-navy-900 text-xs">Courses</p></div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
            activeTab === 'lessons' ? 'border-emerald-600 bg-emerald-50/50 shadow-sm' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700"><BookOpen className="w-4 h-4" /></div>
          <div><p className="font-bold text-navy-900 text-xs">Lessons</p></div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
            activeTab === 'content' ? 'border-emerald-600 bg-emerald-50/50 shadow-sm' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700"><FileText className="w-4 h-4" /></div>
          <div><p className="font-bold text-navy-900 text-xs">Headings</p></div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
            activeTab === 'branding' ? 'border-emerald-600 bg-emerald-50/50 shadow-sm' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700"><ImageIcon className="w-4 h-4" /></div>
          <div><p className="font-bold text-navy-900 text-xs">Branding</p></div>
        </button>
      </div>

      {/* TAB 0: Dashboard Overview */}
      {activeTab === 'dashboard' && (
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="card p-6 border bg-white rounded-xl shadow-sm">
            <h3 className="text-base font-bold text-navy-900">1. Classrooms Management</h3>
            <p className="mt-2 text-xs text-gray-600">Create batches, set schedules, view student stats, and copy links.</p>
            <button onClick={() => setActiveTab('classrooms')} className="mt-4 btn-primary text-xs">Manage Classrooms &rarr;</button>
          </div>
          <div className="card p-6 border bg-white rounded-xl shadow-sm">
            <h3 className="text-base font-bold text-navy-900">2. Courses & Lessons</h3>
            <p className="mt-2 text-xs text-gray-600">Create course categories and upload paid session recordings and notes.</p>
            <button onClick={() => setActiveTab('lessons')} className="mt-4 btn-primary text-xs">Manage Lessons &rarr;</button>
          </div>
          <div className="card p-6 border bg-white rounded-xl shadow-sm">
            <h3 className="text-base font-bold text-navy-900">3. Logo & Web Texts</h3>
            <p className="mt-2 text-xs text-gray-600">Upload brand logo directly and edit homepage headings instantly.</p>
            <button onClick={() => setActiveTab('branding')} className="mt-4 btn-primary text-xs">Manage Branding &rarr;</button>
          </div>
        </div>
      )}

      {/* TAB 1: Classrooms Management & Table View */}
      {activeTab === 'classrooms' && (
        <div className="space-y-8">
          {/* Create / Edit Classroom Form */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-navy-900">
                  {editingId ? 'Edit Classroom / Batch' : 'Create New Classroom & Payment Code'}
                </h2>
                <p className="text-sm text-gray-500">Set course dates, fee, and unique payment verification code for students.</p>
              </div>
              <Users className="w-8 h-8 text-indigo-600 opacity-80" />
            </div>

            <form onSubmit={handleSubmitClassroom} className="space-y-6" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label font-semibold text-gray-700">Select Course</label>
                  <select
                    className="input mt-1"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                  >
                    <option value="">-- Choose a Course --</option>
                    {(courses.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label font-semibold text-gray-700">Classroom / Batch Number</label>
                  <input
                    className="input mt-1"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g. 180"
                  />
                </div>
              </div>

              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="label font-semibold text-gray-700 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-emerald-600" /> Course Dates (Multiple Dates Support)
                </label>
                {courseDates.map((dateVal, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="date"
                      className="input bg-white"
                      value={dateVal}
                      onChange={(e) => handleDateChange(index, e.target.value)}
                    />
                    {courseDates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDateRow(index)}
                        className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDateRow}
                  className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                >
                  + Add Another Date
                </button>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label className="label font-semibold text-gray-700 flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" /> Time
                  </label>
                  <input
                    className="input mt-1"
                    value={courseTime}
                    onChange={(e) => setCourseTime(e.target.value)}
                    placeholder="e.g. 8.00-10.00 PM"
                  />
                </div>
                <div>
                  <label className="label font-semibold text-gray-700 flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-gray-400" /> Course Fee
                  </label>
                  <input
                    className="input mt-1"
                    value={courseFee}
                    onChange={(e) => setCourseFee(e.target.value)}
                    placeholder="e.g. LKR 4500"
                  />
                </div>
                <div>
                  <label className="label font-semibold text-gray-700 flex items-center gap-1">
                    <Key className="w-4 h-4 text-amber-600" /> Payment Access Code
                  </label>
                  <div className="flex gap-2 mt-1">
                    <input
                      className="input font-mono font-bold bg-amber-50/50"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder="e.g. WD-180-XYZ"
                    />
                    <button
                      type="button"
                      onClick={generateRandomCode}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0"
                      title="Generate Random Code"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="label font-semibold text-gray-700">Pre-Session Video Recording Link (Free Public View)</label>
                <div className="relative mt-1">
                  <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    className="input pl-10"
                    value={preSessionVideoUrl}
                    onChange={(e) => setPreSessionVideoUrl(e.target.value)}
                    placeholder="https://.../presession.mp4"
                  />
                </div>
              </div>

              {classroomError && <Alert tone="error">{classroomError}</Alert>}
              {classroomSuccess && <Alert tone="success">{classroomSuccess}</Alert>}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setSelectedCourseId('');
                      setBatchNumber('');
                      setCourseDates(['']);
                      setCourseTime('');
                      setCourseFee('');
                      setAccessCode('');
                      setPreSessionVideoUrl('');
                    }}
                    className="btn-secondary px-6 py-2.5 text-sm"
                  >
                    Cancel Edit
                  </button>
                )}
                <button type="submit" disabled={classroomLoading} className="btn-primary px-8 py-3">
                  {classroomLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                  {classroomLoading ? 'Saving...' : editingId ? 'Update Classroom' : 'Create Classroom & Code'}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Classrooms Table */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-navy-900">Existing Classrooms & Batches Table</h3>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
                Total Batches: {classrooms.length}
              </span>
            </div>

            {classrooms.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No classrooms created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-bold text-navy-700 uppercase tracking-wider">
                      <th className="py-3 px-4">Batch & Course</th>
                      <th className="py-3 px-4">Status & Schedule</th>
                      <th className="py-3 px-4">Fee & Access Code</th>
                      <th className="py-3 px-4 text-center">Registrations</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {classrooms.map((item) => {
                      const status = getStatus(item.courseDates);
                      const regCount = item.registeredStudents?.length || 0;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                                {item.batchNumber}
                              </span>
                              <span className="font-bold text-navy-900">{item.courseName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center w-max px-2 py-0.5 rounded text-xs font-semibold ${status.color}`}>
                                {status.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                {item.courseTime || 'Time not set'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-navy-800">{item.courseFee || 'Free'}</p>
                            <p className="text-xs font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-max mt-1">
                              Code: {item.accessCode || 'N/A'}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => { setActiveModalClassroom(item); setModalTab('registered'); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              <Users className="w-3.5 h-3.5" /> {regCount} Students
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => navigate(`/classroom/${item.id}`)}
                                className="px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center gap-1 shadow transition cursor-pointer"
                                title="Open Classroom Page"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> View
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(item.id)}
                                className="p-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold"
                                title="Copy Student Link"
                              >
                                {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-semibold"
                                title="Edit Classroom"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClassroom(item.id)}
                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-semibold"
                                title="Delete Classroom"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {activeModalClassroom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => setActiveModalClassroom(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-navy-900 mb-1">
              {activeModalClassroom.courseName} ({activeModalClassroom.batchNumber})
            </h3>
            <p className="text-sm text-gray-500 mb-6">Student enrollment and registration details</p>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {!activeModalClassroom.registeredStudents?.length ? (
                <p className="text-sm text-gray-500 py-6 text-center">No students registered yet.</p>
              ) : (
                activeModalClassroom.registeredStudents.map((student, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-bold text-navy-900">{student.fullName}</p>
                      <p className="text-xs text-indigo-600 font-mono">Username: {student.username || 'N/A'} | Email: {student.email}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-400">{student.registeredDate}</span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModalClassroom(null)}
                className="btn-secondary px-6 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Create Courses & Modules */}
      {activeTab === 'courses' && (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-navy-900 mb-2">Create New Course</h2>
            <p className="text-sm text-gray-500 mb-6">Add a brand new course category to your LMS platform.</p>

            <form onSubmit={handleCreateCourse} className="space-y-4" noValidate>
              <div>
                <label className="label font-semibold text-gray-700">Course Title</label>
                <input className="input mt-1" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} placeholder="e.g. Advanced Forex Trading" />
              </div>
              <div>
                <label className="label font-semibold text-gray-700">Course Description</label>
                <textarea rows={2} className="input mt-1 resize-none" value={newCourseDesc} onChange={(e) => setNewCourseDesc(e.target.value)} placeholder="Brief summary of the course..." />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={creatingCourse} className="btn-primary px-6 py-2.5 text-sm">
                  {creatingCourse && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {creatingCourse ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-navy-900 mb-2">Create Module for Course</h2>
            <p className="text-sm text-gray-500 mb-6">Add sections/chapters inside an existing course.</p>

            <form onSubmit={handleCreateModule} className="space-y-4" noValidate>
              <div>
                <label className="label font-semibold text-gray-700">Select Target Course</label>
                <select className="input mt-1" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  {(courses.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label font-semibold text-gray-700">Module Title</label>
                <input className="input mt-1" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="e.g. Module 1: Market Fundamentals" />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={creatingModule || !courseId} className="btn-primary px-6 py-2.5 text-sm">
                  {creatingModule && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {creatingModule ? 'Adding...' : 'Add Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: Course Lessons Manager */}
      {activeTab === 'lessons' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-navy-900">Add Lesson & Video Recording</h2>
              <p className="text-sm text-gray-500">Publish video lessons into your course modules.</p>
            </div>
            <BookOpen className="w-8 h-8 text-emerald-600 opacity-80" />
          </div>

          {courses.data?.length === 0 && (
            <div className="mb-8 p-6 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-bold text-navy-900">No courses found in database</p>
                <p className="mt-1 text-sm text-gray-600">Click to load sample courses or create your own via the 'Courses' tab.</p>
                {seedError && <div className="mt-3"><Alert tone="error">{seedError}</Alert></div>}
              </div>
              <button type="button" onClick={onSeed} disabled={seeding} className="btn-primary shrink-0">
                {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                {seeding ? 'Loading...' : 'Load Sample Courses'}
              </button>
            </div>
          )}

          <form onSubmit={onSubmitLesson} className="space-y-6" noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label font-semibold text-gray-700">Select Course</label>
                <select className="input mt-1" value={courseId} onChange={(e) => setCourseId(e.target.value)} disabled={!courses.data?.length}>
                  {(courses.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label font-semibold text-gray-700">Select Module</label>
                <select className="input mt-1" value={moduleId} onChange={(e) => setModuleId(e.target.value)} disabled={!curriculum.data?.modules.length}>
                  {(curriculum.data?.modules ?? []).map((m) => (
                    <option key={m.id} value={m.id}>Module {m.position}: {m.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label font-semibold text-gray-700">Lesson Title</label>
              <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Reading financial charts" />
            </div>

            <div>
              <label className="label font-semibold text-gray-700">Video Recording Link (MP4 / WebM)</label>
              <div className="relative mt-1">
                <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="url" className="input pl-10" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://.../video.mp4" />
              </div>
            </div>

            <div>
              <label className="label font-semibold text-gray-700">Lesson Description</label>
              <textarea rows={3} className="input mt-1 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will students learn?" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2 sm:items-end bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <label className="label font-semibold text-gray-700">Duration (Minutes)</label>
                <input type="number" min={1} max={600} className="input mt-1 bg-white" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <label className="flex cursor-pointer items-center gap-3 py-2 text-sm font-medium text-navy-700">
                <input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} className="h-4 w-4 accent-emerald-600 rounded" />
                Free Preview Lesson
              </label>
            </div>

            {error && <Alert tone="error">{error}</Alert>}
            {success && <Alert tone="success">{success}</Alert>}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button type="submit" disabled={submitting || !courseId} className="btn-primary px-8 py-3">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {submitting ? 'Publishing...' : 'Publish Lesson'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Web Content Headings */}
      {activeTab === 'content' && (
        <form onSubmit={onSaveSettings} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6" noValidate>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-navy-900">Website Text & Headings Editor</h2>
              <p className="text-sm text-gray-500">Update homepage titles and descriptions.</p>
            </div>
            <FileText className="w-8 h-8 text-purple-600 opacity-80" />
          </div>

          <div>
            <label className="label font-semibold text-gray-700">Website Name</label>
            <input className="input mt-1" value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} />
          </div>

          <div>
            <label className="label font-semibold text-gray-700">Homepage Main Heading</label>
            <input className="input mt-1" value={heroHeading} onChange={(e) => setHeroHeading(e.target.value)} />
          </div>

          <div>
            <label className="label font-semibold text-gray-700">Homepage Subtext Description</label>
            <textarea rows={3} className="input mt-1 resize-none" value={heroSubtext} onChange={(e) => setHeroSubtext(e.target.value)} />
          </div>

          {settingsSuccess && <Alert tone="success">{settingsSuccess}</Alert>}
          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button type="submit" disabled={savingSettings} className="btn-primary px-8 py-3">
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
              {savingSettings ? 'Saving...' : 'Save Web Headings'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: Logo & Branding Uploader */}
      {activeTab === 'branding' && (
        <form onSubmit={onSaveSettings} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6" noValidate>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-navy-900">Logo & Branding Uploader</h2>
              <p className="text-sm text-gray-500">Upload your logo directly and update platform branding.</p>
            </div>
            <ImageIcon className="w-8 h-8 text-amber-600 opacity-80" />
          </div>

          <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-center">
            <label htmlFor="logoFile" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-10 h-10 text-emerald-600 mb-2" />
              <span className="text-sm font-bold text-navy-900">Click here to select logo from computer</span>
              <span className="text-xs text-gray-500 mt-1">PNG, JPG, or WEBP (Under 1MB)</span>
            </label>
            <input id="logoFile" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          {logoUrl && (
            <div className="p-4 border border-emerald-100 rounded-xl bg-emerald-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-navy-900">Active Logo Preview:</span>
                <img src={logoUrl} alt="Logo Preview" className="h-12 object-contain bg-white p-1 border rounded shadow-sm" />
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            </div>
          )}

          {settingsSuccess && <Alert tone="success">{settingsSuccess}</Alert>}
          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button type="submit" disabled={savingSettings} className="btn-primary px-8 py-3">
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
              {savingSettings ? 'Saving Logo...' : 'Save Site Logo'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
