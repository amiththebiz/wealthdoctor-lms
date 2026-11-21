import { useState, useEffect, type FormEvent } from 'react';
import { PlusCircle, Loader2, Link2, Calendar, Clock, DollarSign, Users, Edit3, Trash2, Copy, Check, X, ShieldCheck, Video, FileText, Plus, ExternalLink } from 'lucide-react';
import { Alert } from '@/components/ui/Feedback';
import { errorMessage } from '@/lib/errors';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchAllCourses } from '@/lib/api/catalog';
import { useAsync } from '@/hooks/useAsync';
import { navigate } from '@/lib/router';

interface LessonItem {
  id: string;
  title: string;
  videoUrl: string;
  notes?: string;
  completed?: boolean;
}

interface PaymentSubmission {
  id: string;
  email: string;
  name: string;
  code: string;
  status: 'pending' | 'approved';
  date: string;
}

interface PreSessionViewer {
  name: string;
  phone: string;
  time: string;
  durationWatched: string;
}

interface RegistrationFormData {
  fullName: string;
  title: string;
  maritalStatus: string;
  dob: string;
  address: string;
  nic: string;
  phone: string;
  whatsapp: string;
  email: string;
  occupation: string;
  investmentGoal: string;
  registeredDate: string;
}

interface ClassroomItem {
  id: string;
  courseId: string;
  courseName: string;
  batchNumber: string;
  courseDates: string[];
  courseTime: string;
  courseFee: string;
  preSessionVideo: string;
  lessons?: LessonItem[];
  registeredStudents?: RegistrationFormData[];
  preSessionViewers?: PreSessionViewer[];
  paymentSubmissions?: PaymentSubmission[];
}

export function ClassroomAdminPage() {
  const courses = useAsync(fetchAllCourses, []);
  
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [courseDates, setCourseDates] = useState<string[]>(['']);
  const [courseTime, setCourseTime] = useState('');
  const [courseFee, setCourseFee] = useState('');
  const [preSessionVideoUrl, setPreSessionVideoUrl] = useState('');
  
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeModalClassroom, setActiveModalClassroom] = useState<ClassroomItem | null>(null);
  const [modalTab, setModalTab] = useState<'viewers' | 'registered' | 'payments' | 'lessons'>('lessons');

  // New Lesson form state inside modal
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState('');
  const [newLessonNotes, setNewLessonNotes] = useState('');
  const [addingLesson, setAddingLesson] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
          preSessionVideo: data.preSessionVideo || '',
          lessons: data.lessons || [],
          registeredStudents: data.registeredStudents || [],
          preSessionViewers: data.preSessionViewers || [],
          paymentSubmissions: data.paymentSubmissions || [],
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

  const handleSubmitClassroom = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return setError('Please select a course from the dropdown.');
    if (!batchNumber.trim()) return setError('Enter classroom / batch number.');

    setLoading(true);
    setError(null);
    setSuccess(null);

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
          preSessionVideo: preSessionVideoUrl.trim(),
          updated_at: new Date().toISOString(),
        });
        setSuccess(`Classroom / Batch ${batchNumber} updated successfully!`);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'classrooms'), {
          courseId: selectedCourseId,
          courseName,
          batchNumber: batchNumber.trim(),
          courseDates: validDates,
          courseTime: courseTime.trim(),
          courseFee: courseFee.trim(),
          preSessionVideo: preSessionVideoUrl.trim(),
          lessons: [],
          registeredStudents: [],
          preSessionViewers: [],
          paymentSubmissions: [],
          created_at: new Date().toISOString(),
        });
        setSuccess(`Classroom / Batch ${batchNumber} created successfully!`);
      }

      setSelectedCourseId('');
      setBatchNumber('');
      setCourseDates(['']);
      setCourseTime('');
      setCourseFee('');
      setPreSessionVideoUrl('');
      fetchClassrooms();
    } catch (err) {
      setError(errorMessage(err, 'Failed to save classroom.'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: ClassroomItem) => {
    setEditingId(item.id);
    setSelectedCourseId(item.courseId || '');
    setBatchNumber(item.batchNumber || '');
    setCourseDates(item.courseDates?.length ? item.courseDates : ['']);
    setCourseTime(item.courseTime || '');
    setCourseFee(item.courseFee || '');
    setPreSessionVideoUrl(item.preSessionVideo || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this classroom?')) return;
    try {
      await deleteDoc(doc(db, 'classrooms', id));
      setSuccess('Classroom deleted successfully.');
      fetchClassrooms();
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete classroom.'));
    }
  };

  const handleCopyLink = (id: string) => {
    const link = `${window.location.origin}/#/classroom/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprovePayment = async (classroomId: string, subId: string) => {
    try {
      const classroom = classrooms.find(c => c.id === classroomId);
      if (!classroom) return;

      const updatedSubs = classroom.paymentSubmissions?.map(sub => 
        sub.id === subId ? { ...sub, status: 'approved' as const } : sub
      );

      const docRef = doc(db, 'classrooms', classroomId);
      await updateDoc(docRef, { paymentSubmissions: updatedSubs });
      
      setSuccess('Payment approved successfully!');
      fetchClassrooms();
      
      if (activeModalClassroom && activeModalClassroom.id === classroomId) {
        setActiveModalClassroom({ ...activeModalClassroom, paymentSubmissions: updatedSubs });
      }
    } catch (err) {
      setError(errorMessage(err, 'Failed to approve payment.'));
    }
  };

  const handleAddLesson = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeModalClassroom) return;
    if (!newLessonTitle.trim()) return setError('Please enter lesson title.');

    setAddingLesson(true);
    setError(null);
    try {
      const newLesson: LessonItem = {
        id: Date.now().toString(),
        title: newLessonTitle.trim(),
        videoUrl: newLessonVideoUrl.trim(),
        notes: newLessonNotes.trim(),
        completed: false,
      };

      const docRef = doc(db, 'classrooms', activeModalClassroom.id);
      await updateDoc(docRef, {
        lessons: arrayUnion(newLesson),
      });

      const updatedLessons = [...(activeModalClassroom.lessons || []), newLesson];
      setActiveModalClassroom({ ...activeModalClassroom, lessons: updatedLessons });
      
      setNewLessonTitle('');
      setNewLessonVideoUrl('');
      setNewLessonNotes('');
      setSuccess('New lesson/recording added successfully!');
      fetchClassrooms();
    } catch (err) {
      setError(errorMessage(err, 'Failed to add lesson.'));
    } finally {
      setAddingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!activeModalClassroom) return;
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      const updatedLessons = (activeModalClassroom.lessons || []).filter(l => l.id !== lessonId);
      const docRef = doc(db, 'classrooms', activeModalClassroom.id);
      await updateDoc(docRef, { lessons: updatedLessons });

      setActiveModalClassroom({ ...activeModalClassroom, lessons: updatedLessons });
      setSuccess('Lesson deleted successfully.');
      fetchClassrooms();
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete lesson.'));
    }
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

  return (
    <div className="space-y-8">
      {/* 1. Create / Edit Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-navy-900">
              {editingId ? 'Edit Classroom / Batch' : 'Create New Classroom / Batch'}
            </h2>
            <p className="text-sm text-gray-500">Select course from catalog, add session dates, and set pre-session video.</p>
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
                placeholder="e.g. BATCH-01"
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

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label font-semibold text-gray-700 flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" /> Time
              </label>
              <input
                className="input mt-1"
                value={courseTime}
                onChange={(e) => setCourseTime(e.target.value)}
                placeholder="e.g. Sundays 7.00 PM - 9.00 PM"
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
                placeholder="e.g. LKR 15,000"
              />
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

          {error && <Alert tone="error">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}

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
                  setPreSessionVideoUrl('');
                }}
                className="btn-secondary px-6 py-2.5 text-sm"
              >
                Cancel Edit
              </button>
            )}
            <button type="submit" disabled={loading} className="btn-primary px-8 py-3">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              {loading ? 'Saving...' : editingId ? 'Update Classroom' : 'Create Classroom & Batch'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Existing Classrooms Table */}
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
                  <th className="py-3 px-4">Fee</th>
                  <th className="py-3 px-4 text-center">Pre-Session Registered</th>
                  <th className="py-3 px-4 text-center">Paid Enrolled</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {classrooms.map((item) => {
                  const status = getStatus(item.courseDates);
                  const regCount = item.registeredStudents?.length || 0;
                  const paidCount = item.paymentSubmissions?.filter(s => s.status === 'approved').length || 0;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/classroom/${item.id}`)}
                            className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition underline cursor-pointer"
                            title="Click to Open Classroom"
                          >
                            {item.batchNumber}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/classroom/${item.id}`)}
                            className="font-bold text-navy-900 hover:text-indigo-600 transition text-left cursor-pointer"
                          >
                            {item.courseName}
                          </button>
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
                      <td className="py-3 px-4 font-semibold text-navy-800">{item.courseFee || 'Free'}</td>
                      
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                          <Users className="w-3.5 h-3.5" /> {regCount} Students
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                          <DollarSign className="w-3.5 h-3.5" /> {paidCount} Paid
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
                            onClick={() => handleDelete(item.id)}
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

      {/* 3. Classroom Management & Student Details Modal */}
      {activeModalClassroom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl relative max-h-[85vh] flex flex-col">
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
            <p className="text-sm text-gray-500 mb-6">Manage course lessons/recordings, notes, and view student lists</p>

            <div className="flex border-b border-gray-200 mb-6 gap-6">
              <button
                type="button"
                onClick={() => setModalTab('lessons')}
                className={`pb-3 text-sm font-bold border-b-2 transition ${
                  modalTab === 'lessons' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-navy-900'
                }`}
              >
                Lessons & Notes ({activeModalClassroom.lessons?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('viewers')}
                className={`pb-3 text-sm font-bold border-b-2 transition ${
                  modalTab === 'viewers' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-navy-900'
                }`}
              >
                Pre-Session Viewers ({activeModalClassroom.preSessionViewers?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('registered')}
                className={`pb-3 text-sm font-bold border-b-2 transition ${
                  modalTab === 'registered' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-navy-900'
                }`}
              >
                Registered Students ({activeModalClassroom.registeredStudents?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('payments')}
                className={`pb-3 text-sm font-bold border-b-2 transition ${
                  modalTab === 'payments' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-navy-900'
                }`}
              >
                Payment Approvals ({activeModalClassroom.paymentSubmissions?.length || 0})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {modalTab === 'lessons' ? (
                <div className="space-y-6">
                  <form onSubmit={handleAddLesson} className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-4">
                    <h4 className="font-bold text-navy-900 text-sm flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-600" /> Add New Lesson / Recording & Notes
                    </h4>
                    <div>
                      <label className="label text-xs font-semibold">Lesson Title</label>
                      <input
                        className="input mt-1 bg-white"
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        placeholder="e.g. Session 1: Introduction to Stock Market"
                        required
                      />
                    </div>
                    <div>
                      <label className="label text-xs font-semibold">Video URL (Recording Link)</label>
                      <input
                        type="url"
                        className="input mt-1 bg-white"
                        value={newLessonVideoUrl}
                        onChange={(e) => setNewLessonVideoUrl(e.target.value)}
                        placeholder="https://.../video.mp4"
                      />
                    </div>
                    <div>
                      <label className="label text-xs font-semibold">Lecture Notes / Summary (Optional)</label>
                      <textarea
                        rows={2}
                        className="input mt-1 bg-white resize-none"
                        value={newLessonNotes}
                        onChange={(e) => setNewLessonNotes(e.target.value)}
                        placeholder="Important points or notes link..."
                      />
                    </div>
                    <button type="submit" disabled={addingLesson} className="btn-primary text-xs py-2 px-6">
                      {addingLesson ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      {addingLesson ? 'Adding...' : 'Add Lesson'}
                    </button>
                  </form>

                  <div className="space-y-3">
                    <h4 className="font-bold text-navy-900 text-sm">Existing Lessons ({activeModalClassroom.lessons?.length || 0})</h4>
                    {!activeModalClassroom.lessons?.length ? (
                      <p className="text-sm text-gray-500 py-4 text-center">No lessons added yet for this classroom.</p>
                    ) : (
                      activeModalClassroom.lessons.map((lesson) => (
                        <div key={lesson.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-sm">
                          <div className="space-y-1">
                            <p className="font-bold text-navy-900">{lesson.title}</p>
                            <p className="text-xs text-indigo-600 truncate max-w-md">{lesson.videoUrl || 'No video link'}</p>
                            {lesson.notes && <p className="text-xs text-gray-500">Notes: {lesson.notes}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs"
                            title="Delete Lesson"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : modalTab === 'viewers' ? (
                <div>
                  {!activeModalClassroom.preSessionViewers?.length ? (
                    <p className="text-sm text-gray-500 py-6 text-center">No pre-session viewer records found.</p>
                  ) : (
                    <div className="space-y-3">
                      {activeModalClassroom.preSessionViewers.map((viewer, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between text-sm">
                          <div>
                            <p className="font-bold text-navy-900">{viewer.name}</p>
                            <p className="text-xs text-gray-500">Phone: <span className="font-mono font-semibold">{viewer.phone}</span></p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                              {viewer.durationWatched}
                            </span>
                            <p className="text-[10px] text-gray-400 mt-1">{viewer.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : modalTab === 'registered' ? (
                <div>
                  {!activeModalClassroom.registeredStudents?.length ? (
                    <p className="text-sm text-gray-500 py-6 text-center">No student registration forms submitted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {activeModalClassroom.registeredStudents.map((student, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2 text-xs">
                          <div className="flex justify-between font-bold text-navy-900 text-sm">
                            <span>{student.title}. {student.fullName} ({student.maritalStatus})</span>
                            <span className="text-gray-400 font-normal">NIC: {student.nic}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-gray-600">
                            <p><strong>Phone:</strong> {student.phone} / WhatsApp: {student.whatsapp}</p>
                            <p><strong>Email:</strong> {student.email}</p>
                            <p><strong>DOB:</strong> {student.dob} | <strong>Occupation:</strong> {student.occupation}</p>
                            <p><strong>Goal:</strong> {student.investmentGoal}</p>
                          </div>
                          <p className="text-gray-500 pt-1"><strong>Address:</strong> {student.address}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {!activeModalClassroom.paymentSubmissions?.length ? (
                    <p className="text-sm text-gray-500 py-6 text-center">No payment submissions recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {activeModalClassroom.paymentSubmissions.map((sub) => (
                        <div key={sub.id} className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-100 flex items-center justify-between text-sm">
                          <div>
                            <p className="font-bold text-navy-900">{sub.name} <span className="text-xs font-normal text-gray-500">({sub.email})</span></p>
                            <p className="text-xs text-gray-600 mt-0.5">Code: <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-gray-200">{sub.code}</span></p>
                          </div>
                          <div className="flex items-center gap-3">
                            {sub.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <ShieldCheck className="w-3.5 h-3.5" /> Approved
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApprovePayment(activeModalClassroom.id, sub.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs shadow transition flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve Code
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
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
    </div>
  );
}