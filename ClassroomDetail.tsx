import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useRoute, navigate } from '@/lib/router';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Timer, DollarSign, Video, CheckCircle2, Loader2, ArrowLeft, FileText, Plus, Users, ClipboardList, X, LogIn, ChevronRight, Award, Shield, AlertCircle, BookOpen, Trash2, ExternalLink, Key, Edit3, Bell, Upload, CheckSquare, Play, Square, Clock, CheckCircle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Alert } from '@/components/ui/Feedback';
import { errorMessage } from '@/lib/errors';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LessonItem {
  id: string;
  title: string;
  videoUrl: string;
  notes?: string;
  completed?: boolean;
}

interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  fileUrl?: string;
}

interface NotificationItem {
  id: string;
  message: string;
  date: string;
}

interface AttendanceRecord {
  studentEmail: string;
  studentName: string;
  date: string;
  timestamp: string;
}

interface RegistrationFormData {
  fullName: string;
  title: 'Mr' | 'Mrs' | 'Miss' | 'Dr';
  maritalStatus: 'Married' | 'Unmarried';
  dob: string;
  address: string;
  nic: string;
  phone: string;
  whatsapp: string;
  email: string;
  occupation: string;
  investmentGoal: string;
  username: string;
  password?: string;
  registeredDate: string;
}

interface PreSessionViewer {
  name: string;
  phone: string;
  time: string;
  durationWatched: string;
}

interface ClassroomData {
  id: string;
  courseId?: string;
  courseName: string;
  batchNumber: string;
  courseDates: string[];
  courseTime: string;
  courseFee: string;
  accessCode: string;
  usedAccessCodes?: string[];
  notice?: string;
  preSessionVideo?: string;
  starterCourseAdImage?: string;
  benefits?: string[];
  lessons?: LessonItem[];
  assignments?: AssignmentItem[];
  notifications?: NotificationItem[];
  attendance?: AttendanceRecord[];
  isClassActive?: boolean;
  registeredStudents?: RegistrationFormData[];
  preSessionViewers?: PreSessionViewer[];
}

interface ModuleItem {
  id: string;
  title: string;
  position: number;
}

const DEFAULT_COURSE_BENEFITS: string[] = [
  'Zoom ඔස්සේ සජීවී සැසි 5ක් (පැය 10ක පූර්ණ පුහුණුව)',
  'ක්ෂේත්‍රයේ පළපුරුදු සහතිකලත් උපදේශකවරුන්ගේ නිසි මඟ පෙන්වීම',
  'කොටස් වෙළඳපොළ මූලිකාංග (Stock Market Basics)',
  'CDS ගිණුම් නිවැරදිව විවෘත කරවීම',
  'කොටස් වෙළඳපොළ විශ්ලේෂණය කර ගැනීම',
  'තනිවම සමාගම් විශ්ලේෂණය කර ලාභදායී සමාගම් තෝරා ගැනීම',
  'ඔන්ලයින් පද්ධතියෙන් (Online Trading Platform) ගනුදෙනු කිරීම',
  'කුඩා මුදලකින් ආයෝජනය ආරම්භ කිරීමේ උපක්‍රම',
];

function isZoomUrl(url?: string): boolean {
  if (!url) return false;
  return /zoom\.us/i.test(url.trim());
}

function isEmbedVideoUrl(url?: string): boolean {
  if (!url) return false;
  return /iframe\.mediadelivery\.net\/embed|youtube\.com\/embed|youtu\.be|vimeo\.com/i.test(url.trim());
}

function validateAndFormatSriLankaPhone(rawPhone: string): { formatted: string | null; reason?: string } {
  const digitsOnly = rawPhone.replace(/[\s-]/g, '');
  let normalized = '';

  if (/^07[01245678]\d{7}$/.test(digitsOnly)) {
    normalized = `+94${digitsOnly.slice(1)}`;
  } else if (/^\+947[01245678]\d{7}$/.test(digitsOnly)) {
    normalized = digitsOnly;
  } else {
    return {
      formatted: null,
      reason: 'කරුණාකර වලංගු ශ්‍රී ලංකා ජංගම දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 0771234567).',
    };
  }

  const subscriberDigits = normalized.slice(3);
  const allSameDigit = /^(\d)\1{8}$/.test(subscriberDigits);
  const sequentialDummy = subscriberDigits === '123456789' || subscriberDigits === '012345678';
  const allZeros = /^0+$/.test(subscriberDigits);

  if (allSameDigit || sequentialDummy || allZeros) {
    return {
      formatted: null,
      reason: 'කරුණාකර ආදර්ශ හෝ බොරු අංක වෙනුවට ඔබේ සැබෑ දුරකථන අංකය ඇතුළත් කරන්න.',
    };
  }

  return { formatted: normalized };
}

function compressImageToDataUrl(file: File, maxWidth = 900, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('ඡායාරූපය කියවීමට නොහැකි විය.'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('ගොනුව කියවීමට නොහැකි විය.'));
    reader.readAsDataURL(file);
  });
}

export function ClassroomDetail() {
  const route = useRoute();
  const id = route.segments[1];
  const { user, profile, signUp } = useAuth();

  const isSystemAdmin = profile?.role === 'admin' || user?.email === 'admin@wealthdoctor.lk';

  const [classroom, setClassroom] = useState<ClassroomData | null>(null);
  const [courseModules, setCourseModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Student Pre-Session Login Gate State
  const [isLoggedInAsAdmin, setIsLoggedInAsAdmin] = useState(false);
  const [isLoggedInAsStudent, setIsLoggedInAsStudent] = useState(false);
  const [studentLoginName, setStudentLoginName] = useState('');
  const [studentLoginPhone, setStudentLoginPhone] = useState('');
  const [submittingViewerLogin, setSubmittingViewerLogin] = useState(false);
  const [loginWarning, setLoginWarning] = useState<string | null>(null);

  // Admin Code Update State
  const [editAccessCode, setEditAccessCode] = useState('');
  const [updatingCode, setUpdatingCode] = useState(false);

  // Admin General Edit Info State
  const [editingInfo, setEditingInfo] = useState(false);
  const [editCourseName, setEditCourseName] = useState('');
  const [editBatchNumber, setEditBatchNumber] = useState('');
  const [editCourseTime, setEditCourseTime] = useState('');
  const [editCourseFee, setEditCourseFee] = useState('');
  const [editPreVideo, setEditPreVideo] = useState('');
  const [editStarterAdImage, setEditStarterAdImage] = useState('');
  const [processingAdImage, setProcessingAdImage] = useState(false);

  const [showRegModal, setShowRegModal] = useState(false);
  const [inputAccessCode, setInputAccessCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);

  const [formData, setFormData] = useState<RegistrationFormData>({
    fullName: '',
    title: 'Mr',
    maritalStatus: 'Unmarried',
    dob: '',
    address: '',
    nic: '',
    phone: '',
    whatsapp: '',
    email: user?.email || '',
    occupation: '',
    investmentGoal: '',
    username: '',
    password: '',
    registeredDate: '',
  });
  const [submittingReg, setSubmittingReg] = useState(false);
  const [isRegisteredUser, setIsRegisteredUser] = useState(false);

  const [showRegTableModal, setShowRegTableModal] = useState(false);
  const [showViewersTableModal, setShowViewersTableModal] = useState(false);
  const [showAttendanceTableModal, setShowAttendanceTableModal] = useState(false);

  // Admin Management States
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState('');
  const [newLessonNotes, setNewLessonNotes] = useState('');
  const [addingLesson, setAddingLesson] = useState(false);

  const [newAssignTitle, setNewAssignTitle] = useState('');
  const [newAssignDesc, setNewAssignDesc] = useState('');
  const [newAssignDueDate, setNewAssignDueDate] = useState('');
  const [addingAssignment, setAddingAssignment] = useState(false);

  const [newNotifMsg, setNewNotifMsg] = useState('');
  const [addingNotif, setAddingNotif] = useState(false);

  // Attendance Date Config
  const [activeAttendanceDate, setActiveAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Student Assignment Submission
  const [selectedAssignId, setSelectedAssignId] = useState<string | null>(null);
  const [studentSubmissionLink, setStudentSubmissionLink] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  useEffect(() => {
    async function fetchClassroom() {
      if (!id) {
        setError('Classroom ID not found.');
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'classrooms', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const savedBenefits = Array.isArray(data.benefits) && data.benefits.length > 3
            ? data.benefits
            : DEFAULT_COURSE_BENEFITS;

          const classroomData: ClassroomData = {
            id: snap.id,
            courseId: data.courseId || '',
            courseName: data.courseName || 'General Course',
            batchNumber: data.batchNumber || 'N/A',
            courseDates: data.courseDates || [],
            courseTime: data.courseTime || 'N/A',
            courseFee: data.courseFee || 'Free',
            accessCode: data.accessCode || 'WD123',
            usedAccessCodes: data.usedAccessCodes || [],
            notice: data.notice || '',
            preSessionVideo: data.preSessionVideo || '',
            starterCourseAdImage: data.starterCourseAdImage || '',
            benefits: savedBenefits,
            lessons: data.lessons || [],
            assignments: data.assignments || [],
            notifications: data.notifications || [],
            attendance: data.attendance || [],
            isClassActive: data.isClassActive || false,
            registeredStudents: data.registeredStudents || [],
            preSessionViewers: data.preSessionViewers || [],
          };
          setClassroom(classroomData);
          setEditAccessCode(classroomData.accessCode);
          setEditCourseName(classroomData.courseName);
          setEditBatchNumber(classroomData.batchNumber);
          setEditCourseTime(classroomData.courseTime);
          setEditCourseFee(classroomData.courseFee);
          setEditPreVideo(classroomData.preSessionVideo || '');
          setEditStarterAdImage(classroomData.starterCourseAdImage || '');

          if (classroomData.courseId) {
            try {
              const modSnap = await getDocs(collection(db, `courses/${classroomData.courseId}/modules`));
              const mods: ModuleItem[] = modSnap.docs.map(d => ({
                id: d.id,
                title: d.data().title || 'Module',
                position: d.data().position || 1,
              }));
              setCourseModules(mods.sort((a, b) => a.position - b.position));
            } catch (err) {
              console.error('Error fetching modules:', err);
            }
          }

          if (isSystemAdmin || sessionStorage.getItem(`admin_auth_${id}`) === 'true') {
            setIsLoggedInAsAdmin(true);
          } else if (sessionStorage.getItem(`student_session_${id}`)) {
            setIsLoggedInAsStudent(true);
          }

          if (user?.email) {
            const found = classroomData.registeredStudents?.some(
              s => s.email?.toLowerCase() === user.email?.toLowerCase()
            );
            if (found) {
              setIsRegisteredUser(true);
              setIsLoggedInAsStudent(true);
            }
          }
        } else {
          setError('Classroom not found or invalid link.');
        }
      } catch (err) {
        setError(errorMessage(err, 'Failed to load classroom details.'));
      } finally {
        setLoading(false);
      }
    }
    fetchClassroom();
  }, [id, user, isSystemAdmin]);

  const handleViewerGateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoginWarning(null);

    const trimmedName = studentLoginName.trim();
    if (trimmedName.length < 2 || !/[a-zA-Z\u0D80-\u0DFF]/.test(trimmedName)) {
      return setError('කරුණාකර ඔබේ සැබෑ නම ඇතුළත් කරන්න.');
    }

    const { formatted, reason } = validateAndFormatSriLankaPhone(studentLoginPhone.trim());
    if (!formatted) {
      return setError(reason || 'කරුණාකර වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න.');
    }

    if (!id || !classroom) return;

    setSubmittingViewerLogin(true);
    try {
      const alreadyRegistered = classroom.registeredStudents?.some(
        s => s.phone?.replace(/[\s-]/g, '') === formatted.replace('+94', '0') ||
             s.whatsapp?.replace(/[\s-]/g, '') === formatted.replace('+94', '0') ||
             s.phone?.replace(/[\s-]/g, '') === formatted
      );

      if (alreadyRegistered) {
        setIsRegisteredUser(true);
      }

      const viewerRecord: PreSessionViewer = {
        name: trimmedName,
        phone: formatted,
        time: new Date().toLocaleString(),
        durationWatched: 'Verified Number Session',
      };

      const docRef = doc(db, 'classrooms', id);
      await updateDoc(docRef, {
        preSessionViewers: arrayUnion(viewerRecord),
      });

      setClassroom(prev => prev ? {
        ...prev,
        preSessionViewers: [...(prev.preSessionViewers || []), viewerRecord],
      } : prev);

      sessionStorage.setItem(`student_session_${id}`, formatted);
      setIsLoggedInAsStudent(true);
      setSuccess('සාර්ථකයි! ඔබේ දුරකථන අංකය සටහන් කරගන්නා ලදී. ඔබට දැන් සැසිය නැරඹිය හැක.');
    } catch (err) {
      setError(errorMessage(err, 'ඇතුළු වීමේදී දෝෂයක් ඇති විය.'));
    } finally {
      setSubmittingViewerLogin(false);
    }
  };

  const handleToggleClassActive = async (status: boolean) => {
    if (!id || !classroom) return;
    try {
      const docRef = doc(db, 'classrooms', id);
      await updateDoc(docRef, { isClassActive: status });
      setClassroom(prev => prev ? { ...prev, isClassActive: status } : prev);
      setSuccess(status ? 'පන්තිය සජීවීව ආරම්භ කරන ලදී!' : 'පන්ති සැසිය සාර්ථකව අවසන් කරන ලදී (Class Completed).');
    } catch (err) {
      setError(errorMessage(err, 'Failed to update class status.'));
    }
  };

  const handleAdImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('කරුණාකර ඡායාරූප ගොනුවක් (JPG / PNG / WebP) පමණක් තෝරන්න.');
      return;
    }

    setProcessingAdImage(true);
    setError(null);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 900, 0.82);
      setEditStarterAdImage(compressedDataUrl);
      setSuccess('ඡායාරූපය සූදානම්! Save Classroom Updates ඔබා සුරකින්න.');
    } catch (err) {
      setError(errorMessage(err, 'ඡායාරූපය සැකසීමේදී දෝෂයක් ඇති විය.'));
    } finally {
      setProcessingAdImage(false);
    }
  };

  const handleUpdateClassroomInfo = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !classroom) return;
    setError(null);
    try {
      const docRef = doc(db, 'classrooms', id);
      await updateDoc(docRef, {
        courseName: editCourseName.trim(),
        batchNumber: editBatchNumber.trim(),
        courseTime: editCourseTime.trim(),
        courseFee: editCourseFee.trim(),
        preSessionVideo: editPreVideo.trim(),
        starterCourseAdImage: editStarterAdImage.trim(),
      });
      setClassroom(prev => prev ? {
        ...prev,
        courseName: editCourseName.trim(),
        batchNumber: editBatchNumber.trim(),
        courseTime: editCourseTime.trim(),
        courseFee: editCourseFee.trim(),
        preSessionVideo: editPreVideo.trim(),
        starterCourseAdImage: editStarterAdImage.trim(),
      } : prev);
      setEditingInfo(false);
      setSuccess('Classroom details updated successfully!');
    } catch (err) {
      setError(errorMessage(err, 'Failed to update classroom details.'));
    }
  };

  const handleUpdateAccessCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !editAccessCode.trim()) return setError('Enter valid access code.');
    setUpdatingCode(true);
    setError(null);
    try {
      const trimmedNewCode = editAccessCode.trim();
      const docRef = doc(db, 'classrooms', id);
      await updateDoc(docRef, { accessCode: trimmedNewCode });
      setClassroom(prev => prev ? { ...prev, accessCode: trimmedNewCode } : prev);
      setSuccess('Classroom Access Code updated successfully!');
    } catch (err) {
      setError(errorMessage(err, 'Failed to update access code.'));
    } finally {
      setUpdatingCode(false);
    }
  };

  const generateRandomAdminCode = () => {
    const code = 'WD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setEditAccessCode(code);
  };

  const handleVerifyAccessCode = (e: FormEvent) => {
    e.preventDefault();
    if (!classroom) return;

    const cleanInput = (inputAccessCode || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanSavedCode = (classroom.accessCode || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (classroom.usedAccessCodes?.includes(inputAccessCode.trim())) {
      return setError('මෙම රහස් කේතය (Access Code) මීට පෙර වෙනත් ලියාපදිංචියක් සඳහා භාවිත කර ඇත.');
    }

    if (cleanInput === cleanSavedCode && cleanInput !== '') {
      setCodeVerified(true);
      setError(null);
    } else {
      setError('ඇතුළත් කළ රහස් කේතය (Access Code) වැරදියි.');
    }
  };

  const handleAddLesson = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !classroom) return;
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

      const docRef = doc(db, 'classrooms', id);
      await updateDoc(docRef, { lessons: arrayUnion(newLesson) });

      setClassroom(prev => prev ? { ...prev, lessons: [...(prev.lessons || []), newLesson] } : prev);
      setNewLessonTitle('');
      setNewLessonVideoUrl('');
      setNewLessonNotes('');
      setSuccess('New lesson added successfully!');
    } catch (err) {
      setError(errorMessage(err, 'Failed to add lesson.'));
    } finally {
      setAddingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!id || !classroom) return;
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      const updatedLessons = (classroom.lessons || []).filter(l => l.id !== lessonId);
      const docRef = doc(db, 'classrooms', id);
      await updateDoc(docRef, { lessons: updatedLessons });

      setClassroom(prev => prev ? { ...prev, lessons: updatedLessons } : prev);
      setSuccess('Lesson deleted successfully.');
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete lesson.'));
    }
  };

  const handleAddAssignment = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !classroom) return;
    if (!newAssignTitle.trim()) return setError('Please enter assignment title.');

    setAddingAssignment(true);
    setError(null);
    try {
      const newAssign: AssignmentItem = {
        id: Date.now().toString(),
        title: newAssignTitle.trim(),
        description: newAssignDesc.trim(),
        dueDate: newAssignDueDate.trim(),
      };

      const docRef = doc(db, 'classrooms', id);
      await updateDoc(docRef, { assignments: arrayUnion(newAssign) });

      setClassroom(prev => prev ? { ...prev, assignments: [...(prev.assignments || []), newAssign] } : prev);
      setNewAssignTitle('');
      setNewAssignDesc('');
      setNewAssignDueDate('');
      setSuccess('Assignment added successfully!');
    } catch (err) {
      setError(errorMessage(err, 'Failed to add assignment.'));
    } finally {
      setAddingAssignment(false);
    }
  };

  const handleAddNotification = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !classroom) return;
    if (!newNotifMsg.trim()) return setError('Please enter notification message.');

    setAddingNotif(true);
    setError(null);
    try {
      const notifItem: NotificationItem = {
        id: Date.now().toString(),
        message: newNotifMsg.trim(),
        date: new Date().toLocaleString(),
      };

      const docRef = doc(db, 'classrooms', id);
      await updateDoc(docRef, { notifications: arrayUnion(notifItem) });

      setClassroom(prev => prev ? { ...prev, notifications: [...(prev.notifications || []), notifItem] } : prev);
      setNewNotifMsg('');
      setSuccess('Notification posted successfully!');
    } catch (err) {
      setError(errorMessage(err, 'Failed to post notification.'));
    } finally {
      setAddingNotif(false);
    }
  };

  const handleAssignmentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAssignId || !studentSubmissionLink.trim()) return setError('කරුණාකර විසඳුම් ලින්ක් එක ඇතුළත් කරන්න.');
    setSubmittingAssign(true);
    try {
      setSuccess('ඔබගේ ඇසයිමන්ට් එක සාර්ථකව සබ්මිට් කරන ලදී!');
      setSelectedAssignId(null);
      setStudentSubmissionLink('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to submit assignment.'));
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!id || !classroom || !user?.email) return;
    if (!classroom.isClassActive) {
      return setError('පන්තිය තවම ආරම්භ කර නැත. පැමිණීම සටහන් කළ හැක්කේ පන්ති පැවැත්වෙන වෙලාවට පමණි.');
    }

    try {
      const record: AttendanceRecord = {
        studentEmail: user.email,
        studentName: profile?.full_name || user.email,
        date: activeAttendanceDate,
        timestamp: new Date().toLocaleString(),
      };

      const docRef = doc(db, 'classrooms', id);
      await updateDoc(docRef, {
        attendance: arrayUnion(record),
      });

      setClassroom(prev => prev ? { ...prev, attendance: [...(prev.attendance || []), record] } : prev);
      setSuccess(`පැමිණීම (${activeAttendanceDate}) සාර්ථකව සටහන් කරගන්නා ලදී!`);
    } catch (err) {
      setError(errorMessage(err, 'Failed to mark attendance.'));
    }
  };

  const formatTimeWithAMPM = (timeStr: string) => {
    if (!timeStr) return 'N/A';
    if (/am|pm/i.test(timeStr)) return timeStr;
    return `${timeStr} PM`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const sortedDates = classroom?.courseDates ? [...classroom.courseDates].sort() : [];
  const firstSessionDate = sortedDates.length > 0 ? formatDate(sortedDates[0]) : 'ඉක්මනින් දැනුම් දෙනු ලැබේ';

  const handleRegistrationSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.nic || !formData.phone || !formData.email || !formData.username || !formData.password) {
      return setError('කරුණාකර සියලුම විස්තර පුරවන්න.');
    }
    if (!id || !classroom) return;

    setSubmittingReg(true);
    setError(null);
    try {
      const signupResult = await signUp({
        email: formData.email.trim(),
        password: formData.password || '',
        fullName: formData.fullName.trim()
      });

      if (signupResult) {
        setSubmittingReg(false);
        return setError(signupResult);
      }

      const payload: RegistrationFormData = {
        ...formData,
        registeredDate: new Date().toISOString().split('T')[0],
      };

      const docRef = doc(db, 'classrooms', id);
      await updateDoc(docRef, {
        registeredStudents: arrayUnion(payload),
        usedAccessCodes: arrayUnion(inputAccessCode.trim()),
      });

      setClassroom(prev => prev ? {
        ...prev,
        registeredStudents: [...(prev.registeredStudents || []), payload],
        usedAccessCodes: [...(prev.usedAccessCodes || []), inputAccessCode.trim()]
      } : prev);

      setShowRegModal(false);
      setCodeVerified(false);
      setInputAccessCode('');
      setIsRegisteredUser(true);
      setSuccess('ලියාපදිංචිය සාර්ථකයි! ඔබට දැන් පන්ති කාමරයට පිවිසිය හැක.');
    } catch (err) {
      setError(errorMessage(err, 'ලියාපදිංචි වීමේදී දෝෂයක් ඇති විය.'));
    } finally {
      setSubmittingReg(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error && !classroom) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-32 pb-24 text-center">
        <Alert tone="error">{error}</Alert>
        <button onClick={() => navigate('/dashboard')} className="mt-6 inline-flex items-center gap-2 btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  if (!isLoggedInAsAdmin && !isLoggedInAsStudent && !isRegisteredUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-20">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-xl border border-gray-100 space-y-6 text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <LogIn className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-navy-900">{classroom?.courseName}</h2>
            <p className="text-xs text-gray-500 mt-1">Batch: {classroom?.batchNumber} | සැසිය නැරඹීමට ඔබේ නම සහ වලංගු දුරකථන අංකය ඇතුළත් කරන්න.</p>
          </div>

          {error && <Alert tone="error">{error}</Alert>}
          {loginWarning && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{loginWarning}</span>
            </div>
          )}
          {success && <Alert tone="success">{success}</Alert>}

          <form onSubmit={handleViewerGateSubmit} className="space-y-4 text-left pt-2">
            <div>
              <label className="label font-semibold text-gray-700">Full Name (ඔබේ නම)</label>
              <input
                className="input mt-1"
                value={studentLoginName}
                onChange={(e) => setStudentLoginName(e.target.value)}
                placeholder="ඔබේ සම්පූර්ණ නම"
                required
              />
            </div>
            <div>
              <label className="label font-semibold text-gray-700">Mobile Number (දුරකථන අංකය)</label>
              <input
                type="tel"
                className="input mt-1 font-mono"
                value={studentLoginPhone}
                onChange={(e) => setStudentLoginPhone(e.target.value)}
                placeholder="0771234567"
                required
              />
            </div>
            <button type="submit" disabled={submittingViewerLogin} className="w-full btn-primary py-3 font-bold mt-2 shadow-lg flex items-center justify-center gap-2">
              {submittingViewerLogin ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submittingViewerLogin ? 'පරීක්ෂා කරමින්...' : 'සැසිය නරඹන්න (Watch Session)'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isAdminActive = isLoggedInAsAdmin;
  const isPaidOrAdmin = isAdminActive || isRegisteredUser;

  const alreadyMarkedAttendance = classroom?.attendance?.some(
    a => a.studentEmail?.toLowerCase() === user?.email?.toLowerCase() && a.date === activeAttendanceDate
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 space-y-8">
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-navy-900 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-indigo-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
            Batch: {classroom?.batchNumber} {isAdminActive ? '— [ADMIN MODE]' : isRegisteredUser ? '— [ENROLLED STUDENT]' : ''}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{classroom?.courseName}</h1>
          <p className="text-indigo-200 text-sm max-w-xl">
            {isAdminActive ? 'Manage recordings, assignments, notifications, attendance & payments.' : isRegisteredUser ? 'ඔබගේ නිල පන්ති කාමරය සහ ඉගෙනුම් ද්වාරය (Official Classroom).' : 'Pre-Session & Zoom Presentation Portal.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
          {isAdminActive && (
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Admin Control
              </span>
              <button
                type="button"
                onClick={() => setEditingInfo(!editingInfo)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition inline-flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" /> {editingInfo ? 'Close Edit' : 'Edit Info'}
              </button>
              <button
                type="button"
                onClick={() => setShowAttendanceTableModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition inline-flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5" /> Attendance ({classroom?.attendance?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setShowViewersTableModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition inline-flex items-center gap-1"
              >
                <ClipboardList className="w-3.5 h-3.5" /> Viewers ({classroom?.preSessionViewers?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setShowRegTableModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition inline-flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" /> Students ({classroom?.registeredStudents?.length || 0})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN: EDIT GENERAL CLASSROOM INFO PANEL */}
      {isAdminActive && editingInfo && (
        <div className="bg-amber-50/90 rounded-3xl border border-amber-300 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="border-b border-amber-200 pb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-700" /> Edit Classroom Details (සියලුම විස්තර සංස්කරණය)
            </h3>
          </div>
          <form onSubmit={handleUpdateClassroomInfo} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label text-xs font-semibold text-gray-700">Course Name</label>
              <input
                className="input mt-1 bg-white"
                value={editCourseName}
                onChange={(e) => setEditCourseName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label text-xs font-semibold text-gray-700">Batch Number</label>
              <input
                className="input mt-1 bg-white"
                value={editBatchNumber}
                onChange={(e) => setEditBatchNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label text-xs font-semibold text-gray-700">Course Time</label>
              <input
                className="input mt-1 bg-white"
                value={editCourseTime}
                onChange={(e) => setEditCourseTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label text-xs font-semibold text-gray-700">Course Fee</label>
              <input
                className="input mt-1 bg-white"
                value={editCourseFee}
                onChange={(e) => setEditCourseFee(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label text-xs font-semibold text-gray-700">Zoom / Presentation Link</label>
              <input
                type="url"
                className="input mt-1 bg-white"
                value={editPreVideo}
                onChange={(e) => setEditPreVideo(e.target.value)}
                placeholder="https://zoom.us/j/..."
              />
            </div>

            {/* Direct Image File Upload for Starter Course Ad */}
            <div className="sm:col-span-2 bg-white p-4 rounded-2xl border border-amber-200 space-y-3">
              <label className="label text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" /> Stock Market Starter Course Ad Image (ඡායාරූපය තෝරන්න)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition">
                  {processingAdImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {processingAdImage ? 'සකසමින්...' : 'Upload Image File (ඡායාරූපයක් තෝරන්න)'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAdImageFileChange}
                  />
                </label>
                {editStarterAdImage && (
                  <button
                    type="button"
                    onClick={() => setEditStarterAdImage('')}
                    className="text-xs text-red-600 hover:underline font-semibold"
                  >
                    Remove Image (ඉවත් කරන්න)
                  </button>
                )}
              </div>
              {editStarterAdImage && (
                <div className="mt-2 max-w-xs rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <img src={editStarterAdImage} alt="Starter Course Ad Preview" className="w-full h-auto object-cover" />
                </div>
              )}
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditingInfo(false)} className="btn-secondary text-xs px-5 py-2">
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs px-6 py-2 bg-amber-600 hover:bg-amber-700">
                Save Classroom Updates
              </button>
            </div>
          </form>
        </div>
      )}

      {/* NOTIFICATIONS / ANNOUNCEMENTS SECTION FROM INSTITUTE */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl border border-blue-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-blue-200 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600 animate-bounce" />
            <h3 className="text-xl font-extrabold text-navy-900">Institute Notifications & Announcements (ආයතනික දැනුම්දීම්)</h3>
          </div>
          <span className="px-3 py-1 bg-indigo-200 text-indigo-900 text-xs font-bold rounded-full">
            {classroom?.notifications?.length || 0} Notices
          </span>
        </div>

        {!classroom?.notifications || classroom.notifications.length === 0 ? (
          <p className="text-xs text-gray-500 py-2">තවදුරටත් විශේෂ දැනුම්දීම් නිකුත් කර නැත.</p>
        ) : (
          <div className="space-y-3">
            {classroom.notifications.map((notif) => (
              <div key={notif.id} className="p-4 rounded-2xl bg-white border border-blue-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <p className="text-sm font-semibold text-navy-900">{notif.message}</p>
                <span className="text-[11px] text-gray-400 font-mono shrink-0">{notif.date}</span>
              </div>
            ))}
          </div>
        )}

        {isAdminActive && (
          <form onSubmit={handleAddNotification} className="pt-4 border-t border-blue-200 flex flex-col sm:flex-row gap-3">
            <input
              className="input bg-white text-xs"
              value={newNotifMsg}
              onChange={(e) => setNewNotifMsg(e.target.value)}
              placeholder="Post a new notification for students..."
              required
            />
            <button type="submit" disabled={addingNotif} className="btn-primary text-xs py-2.5 px-6 shrink-0">
              {addingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Post Notice
            </button>
          </form>
        )}
      </div>

      {/* LIVE ATTENDANCE MARKING SECTION WITH CLASS COMPLETED STATUS */}
      {isPaidOrAdmin && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200 pb-4">
            <div className="space-y-1 text-left">
              <h3 className="text-lg font-extrabold text-emerald-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-700" /> Class Attendance (පන්ති පැමිණීම සටහන් කරන්න)
              </h3>
              <p className="text-xs font-semibold">
                {classroom?.isClassActive ? (
                  <span className="text-emerald-700 inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span> 🔴 පන්තිය දැන් සජීවීව ක්‍රියාත්මක වේ (Live Attendance Open)
                  </span>
                ) : (
                  <span className="text-navy-700 inline-flex items-center gap-1 font-extrabold">
                    ✅ මෙම පන්තිය අවසන් වී ඇත (Class Session Completed)
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-emerald-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700">Date:</span>
                <input
                  type="date"
                  className="input text-xs py-1 px-2 font-mono"
                  value={activeAttendanceDate}
                  onChange={(e) => setActiveAttendanceDate(e.target.value)}
                />
              </div>

              {isAdminActive && (
                <div className="flex items-center gap-2">
                  {classroom?.isClassActive ? (
                    <button
                      type="button"
                      onClick={() => handleToggleClassActive(false)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 shadow"
                    >
                      <Square className="w-3.5 h-3.5" /> End Class / Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleClassActive(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 shadow"
                    >
                      <Play className="w-3.5 h-3.5" /> Start Class Session
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-semibold text-emerald-800">
              Selected Attendance Date: <strong className="font-mono underline">{activeAttendanceDate}</strong>
            </span>

            {!isAdminActive && (
              <div>
                {alreadyMarkedAttendance ? (
                  <span className="px-5 py-2.5 bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Attendance Marked for {activeAttendanceDate}
                  </span>
                ) : classroom?.isClassActive ? (
                  <button
                    type="button"
                    onClick={handleMarkAttendance}
                    className="btn-primary text-xs py-2.5 px-6 shadow-lg bg-emerald-600 hover:bg-emerald-700"
                  >
                    Mark Attendance Now (පැමිණීම සටහන් කරන්න)
                  </button>
                ) : (
                  <span className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-gray-500" /> Class Session Completed (පන්තිය අවසන්)
                  </span>
                )}
              </div>
            )}

            {isAdminActive && (
              <span className="px-4 py-2 bg-amber-100 text-amber-800 text-xs font-bold rounded-xl">
                Total Attendance Entries ({classroom?.attendance?.length || 0})
              </span>
            )}
          </div>
        </div>
      )}

      {/* ADMIN ACCESS CODE MANAGER */}
      {isAdminActive && (
        <div className="bg-amber-50/70 rounded-3xl border border-amber-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-amber-200 pb-4">
            <div>
              <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-700" /> Admin: Classroom Access Code Management
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">මෙම පන්ති කාමරයට අදාළ රහස් කේතය (Access Code) බලාගැනීමට සහ වෙනස් කිරීමට හැක.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateAccessCode} className="bg-white p-5 rounded-2xl border border-amber-100 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full">
              <label className="label text-xs font-semibold text-gray-700">Current Access Code</label>
              <div className="flex gap-2 mt-1">
                <input
                  className="input font-mono font-bold bg-amber-50 text-navy-900"
                  value={editAccessCode}
                  onChange={(e) => setEditAccessCode(e.target.value)}
                  placeholder="Enter Access Code"
                  required
                />
                <button
                  type="button"
                  onClick={generateRandomAdminCode}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0"
                >
                  Generate New
                </button>
              </div>
            </div>
            <button type="submit" disabled={updatingCode} className="w-full sm:w-auto mt-6 sm:mt-0 btn-primary text-xs py-3 px-6 shrink-0">
              {updatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
              {updatingCode ? 'Updating...' : 'Save Code'}
            </button>
          </form>
        </div>
      )}

      {/* ADMIN MANAGEMENT: LESSONS, VIDEOS & LECTURE NOTES */}
      {isAdminActive && (
        <div className="bg-emerald-50/60 rounded-3xl border border-emerald-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-4">
            <div>
              <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-700" /> Admin: Add Lessons, Videos & Lecture Notes
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">මෙම බැච් එකට අදාළව නව පාඩම් Bunny.net Embed / Zoom / Video ලින්ක් සහ PDF සටහන් එකතු කරන්න.</p>
            </div>
            <span className="px-3 py-1 bg-emerald-200/60 text-emerald-800 text-xs font-bold rounded-full">
              {classroom?.lessons?.length || 0} Lessons
            </span>
          </div>

          <form onSubmit={handleAddLesson} className="space-y-4 bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm" noValidate>
            <div>
              <label className="label text-xs font-semibold text-gray-700">Lesson Title (පාඩමේ මාතෘකාව)</label>
              <input
                className="input mt-1"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="e.g. Session 1: Introduction to Stock Market"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label text-xs font-semibold text-gray-700">Bunny Embed / Zoom / Video URL</label>
                <input
                  type="url"
                  className="input mt-1"
                  value={newLessonVideoUrl}
                  onChange={(e) => setNewLessonVideoUrl(e.target.value)}
                  placeholder="https://iframe.mediadelivery.net/embed/..."
                />
              </div>
              <div>
                <label className="label text-xs font-semibold text-gray-700">Lecture Notes / PDF Link (සටහන්)</label>
                <input
                  type="url"
                  className="input mt-1"
                  value={newLessonNotes}
                  onChange={(e) => setNewLessonNotes(e.target.value)}
                  placeholder="https://.../notes.pdf"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={addingLesson} className="btn-primary text-xs py-2.5 px-6">
                {addingLesson ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {addingLesson ? 'Adding Lesson...' : 'Add Lesson & Notes'}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <h4 className="font-bold text-navy-900 text-sm">Existing Lessons ({classroom?.lessons?.length || 0})</h4>
            {!classroom?.lessons || classroom.lessons.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">No lessons added yet.</p>
            ) : (
              classroom.lessons.map((lesson) => (
                <div key={lesson.id} className="p-4 rounded-xl bg-white border border-emerald-100 flex items-center justify-between text-sm shadow-sm">
                  <div className="space-y-1">
                    <p className="font-bold text-navy-900">{lesson.title}</p>
                    {lesson.videoUrl && (
                      <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                        <Video className="w-3.5 h-3.5" /> {isZoomUrl(lesson.videoUrl) ? 'Open Zoom Session' : 'Video Link'} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {lesson.notes && (
                      <a href={lesson.notes} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> Download Notes <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
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
      )}

      {/* ADMIN MANAGEMENT: ASSIGNMENTS */}
      {isAdminActive && (
        <div className="bg-indigo-50/60 rounded-3xl border border-indigo-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-indigo-200 pb-4">
            <div>
              <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-700" /> Admin: Create & Manage Assignments (ඇසයිමන්ට් එකතු කරන්න)
              </h3>
            </div>
            <span className="px-3 py-1 bg-indigo-200 text-indigo-900 text-xs font-bold rounded-full">
              {classroom?.assignments?.length || 0} Assignments
            </span>
          </div>

          <form onSubmit={handleAddAssignment} className="space-y-4 bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm" noValidate>
            <div>
              <label className="label text-xs font-semibold text-gray-700">Assignment Title (මාතෘකාව)</label>
              <input
                className="input mt-1"
                value={newAssignTitle}
                onChange={(e) => setNewAssignTitle(e.target.value)}
                placeholder="e.g. Assignment 1: Technical Analysis Report"
                required
              />
            </div>
            <div>
              <label className="label text-xs font-semibold text-gray-700">Description / Instructions (විස්තරය)</label>
              <textarea
                rows={2}
                className="input mt-1 resize-none"
                value={newAssignDesc}
                onChange={(e) => setNewAssignDesc(e.target.value)}
                placeholder="Provide instructions for students..."
              />
            </div>
            <div>
              <label className="label text-xs font-semibold text-gray-700">Due Date (නියමිත දිනය)</label>
              <input
                type="date"
                className="input mt-1"
                value={newAssignDueDate}
                onChange={(e) => setNewAssignDueDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={addingAssignment} className="btn-primary text-xs py-2.5 px-6">
                {addingAssignment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Assignment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pre-Session Presentation / Zoom Section: Shown ONLY to Free Viewers */}
      {!isPaidOrAdmin && (
        <div id="pre-session-video" className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Video className="w-5 h-5" /></div>
              <div>
                <h3 className="text-lg font-bold text-navy-900">Free Zoom Session (නොමිලේ සැසිය)</h3>
              </div>
            </div>
          </div>

          {classroom?.preSessionVideo ? (
            isZoomUrl(classroom.preSessionVideo) ? (
              <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-bold">Free SESSION</span>
                  <h4 className="text-base font-extrabold text-navy-900 pt-1">Recording සූදානම්</h4>
                  <p className="text-xs text-gray-600"> නොමිලේ සැසිය නැරඹීමට පහත බටන් එකෙන් පිවිසෙන්න.</p>
                </div>
                <a
                  href={classroom.preSessionVideo}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-xs py-3 px-6 shrink-0 inline-flex items-center gap-2 shadow-lg"
                >
                  <Video className="w-4 h-4" /> Watch Now <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : isEmbedVideoUrl(classroom.preSessionVideo) ? (
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner">
                <iframe
                  src={classroom.preSessionVideo}
                  loading="lazy"
                  className="w-full h-full border-0"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner">
                <video controls className="w-full h-full object-cover" src={classroom.preSessionVideo}>
                  Your browser does not support the video tag.
                </video>
              </div>
            )
          ) : (
            <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-500">
              Presentation link is not added yet for this batch.
            </div>
          )}
        </div>
      )}

      {/* STUDENT LESSONS & LECTURE NOTES DISPLAY SECTION: Shown ONLY to Paid Students & Admin */}
      {isPaidOrAdmin && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-extrabold text-navy-900">Classroom Lessons & Lecture Notes (පාඩම් සහ පටිගත කිරීම්)</h3>
              <p className="text-xs text-gray-500 mt-1">මෙම පන්ති කාමරයට අදාළව ලබා දී ඇති සියලුම පාඩම් වීඩියෝ සහ PDF සටහන්.</p>
            </div>
            <BookOpen className="w-8 h-8 text-emerald-600" />
          </div>

          {!classroom?.lessons || classroom.lessons.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-500">
              පන්ති කාමරය සඳහා පාඩම් තවදුරටත් එකතු කර නැත.
            </div>
          ) : (
            <div className="space-y-6">
              {classroom.lessons.map((lesson, idx) => (
                <div key={lesson.id || idx} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-navy-900 text-base">{lesson.title}</h4>
                        <p className="text-xs text-gray-500">
                          {isZoomUrl(lesson.videoUrl) ? 'Zoom Session Link Available' : isEmbedVideoUrl(lesson.videoUrl) ? 'Protected Stream Player' : 'Session Recording & Notes Available'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {lesson.videoUrl && !isEmbedVideoUrl(lesson.videoUrl) && (
                        <a
                          href={lesson.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow transition"
                        >
                          <Video className="w-3.5 h-3.5" /> {isZoomUrl(lesson.videoUrl) ? 'Open Zoom' : 'Watch Video'}
                        </a>
                      )}
                      {lesson.notes && (
                        <a
                          href={lesson.notes}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow transition"
                        >
                          <FileText className="w-3.5 h-3.5" /> Notes (PDF)
                        </a>
                      )}
                    </div>
                  </div>

                  {lesson.videoUrl && isEmbedVideoUrl(lesson.videoUrl) && (
                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-md">
                      <iframe
                        src={lesson.videoUrl}
                        loading="lazy"
                        className="w-full h-full border-0"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STUDENT ASSIGNMENTS SECTION: Shown ONLY to Paid Students & Admin */}
      {isPaidOrAdmin && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-extrabold text-navy-900">Assignments & Submissions (ඇසයිමන්ට් සහ සබ්මිෂන්)</h3>
              <p className="text-xs text-gray-500 mt-1">ඔබට නියම කර ඇති ඇසයිමන්ට් මෙහි පිළිතුරු සමඟ සබ්මිට් කරන්න.</p>
            </div>
            <FileText className="w-8 h-8 text-indigo-600" />
          </div>

          {!classroom?.assignments || classroom.assignments.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-500">
              මෙම පන්ති කාමරය සඳහා ඇසයිමන්ට් තවම නිකුත් කර නැත.
            </div>
          ) : (
            <div className="space-y-4">
              {classroom.assignments.map((assign) => (
                <div key={assign.id} className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-navy-900 text-base">{assign.title}</h4>
                    <p className="text-xs text-gray-600">{assign.description}</p>
                    {assign.dueDate && (
                      <p className="text-[11px] font-semibold text-amber-700">Due Date: {assign.dueDate}</p>
                    )}
                  </div>

                  {!isAdminActive && (
                    <button
                      type="button"
                      onClick={() => setSelectedAssignId(assign.id)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow transition shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" /> Submit Assignment
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STUDENT ASSIGNMENT SUBMISSION MODAL */}
      {selectedAssignId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setSelectedAssignId(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-navy-900">Submit Assignment</h3>
            <p className="text-xs text-gray-500">ඔබගේ පිළිතුරු ලියැවී ඇති ලින්ක් එක (Google Drive / PDF Link) පහතින් ඇතුළත් කරන්න.</p>

            <form onSubmit={handleAssignmentSubmit} className="space-y-3">
              <input
                type="url"
                className="input text-xs"
                value={studentSubmissionLink}
                onChange={(e) => setStudentSubmissionLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                required
              />
              <button type="submit" disabled={submittingAssign} className="w-full btn-primary py-2.5 text-xs font-bold">
                {submittingAssign ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Submission'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PRE-SESSION SECTION: SHOWN ONLY TO FREE VIEWERS */}
      {!isPaidOrAdmin && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-sm space-y-8">
          <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 text-navy-900 space-y-5 shadow-sm">
            <div className="space-y-2">
              <h4 className="font-extrabold text-xl text-emerald-900">
               ඔබ තවදුරටත් කොටස් වෙළඳපොළ ආයෝජනයෙන් ඉදිරියට යාමට අදහස් කරන්නේද?
              </h4>
              <p className="text-sm leading-relaxed text-gray-700">
                ඔබ අපගේ සජීවී සැසියට සහභාගි වුණාද නැතහොත් මෙම රෙකෝඩින් ඔස්සේ එය පරිශීලනය කළාද? ඔබ තවදුරටත් කොටස් වෙළඳපොළ ආයෝජනයෙන් ඉදිරියට යාමට අදහස් කරන්නේද? එසේ නම් Starter පාඨමාලාව සමඟ සම්බන්ධ වන්න.පාඨමාලාවට අදාළ ඉදිරි සැසි දින,වේලාවන් සහ කාලසටහන පහතින් දැක්වේ.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-2">
              <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase">
                  <Calendar className="w-4 h-4" /> Session Dates & Remaining Days
                </div>
                <div className="space-y-1 pl-2 border-l-2 border-emerald-500">
                  {sortedDates.length > 0 ? (
                    sortedDates.map((dateStr, idx) => (
                      <div key={idx} className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Session {idx + 1}: {formatDate(dateStr)}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 font-medium">Start Date: {firstSessionDate}</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Timer className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-gray-500 font-semibold uppercase">Schedule Time</p>
                  <p className="text-sm font-extrabold text-navy-900 mt-0.5">
                    {formatTimeWithAMPM(classroom?.courseTime || '')}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><DollarSign className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-gray-500 font-semibold uppercase">Starter Course Fee</p>
                  <p className="text-sm font-extrabold text-navy-900 mt-0.5">{classroom?.courseFee || 'Free'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-navy-900 via-indigo-950 to-emerald-950 rounded-3xl overflow-hidden text-white shadow-2xl border border-indigo-500/20">
            <div className="grid md:grid-cols-2 items-center">
              <div className="p-6 sm:p-8 space-y-4 text-left">
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-[11px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> ස්ටාටර් කෝස් (Starter Course Ad)
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                  Stock Market Starter Course 
                </h3>
                <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
                  කොටස් වෙළඳපොළ ආයෝජනයේ ප්‍රායෝගික ක්‍රමෝපායන් සියල්ල මූල සිට සරලව සහ නිවැරදිව ඉගෙන ගන්න. Batch: <strong>{classroom?.batchNumber}</strong> සඳහා දැන්ම ලියාපදිංචි වන්න.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRegModal(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-navy-950 font-extrabold py-2.5 px-5 rounded-xl text-xs shadow-lg transition flex items-center gap-1.5"
                  >
                    <Key className="w-4 h-4" /> Register Now ({classroom?.courseFee || 'Enroll'})
                  </button>
                  <a
                    href="https://wa.me/94742052343"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl text-xs border border-white/20 transition"
                  >
                    WhatsApp Inquiry
                  </a>
                </div>
              </div>

              <div className="h-full min-h-[260px] w-full bg-indigo-900/40 relative overflow-hidden flex items-center justify-center">
                {classroom?.starterCourseAdImage ? (
                  <img
                    src={classroom.starterCourseAdImage}
                    alt="Stock Market Starter Course"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-6 text-center space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-300">
                      <Award className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-extrabold text-white">ස්ටොක් මාකට් ස්ටාටර් පාඨමාලාව</p>
                    <p className="text-xs text-indigo-200">Batch {classroom?.batchNumber} · {firstSessionDate}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 pt-2 pb-2">
            <h3 className="text-xl font-extrabold text-navy-900">පාඨමාලාව සඳහා ලියාපදිංචි වෙන්නේ කෙසේද? (Registration Steps)</h3>
            <p className="text-xs text-gray-500 mt-1">බැංකු ගිණුමට මුදල් බැංකුගත කර පහත අයුරින් ලියාපදිංචි වන්න.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center font-bold justify-center">1</div>
              <h4 className="font-bold text-navy-900 text-lg">බැංකු ගිණුමට මුදල් බැංකුගත කරන්න</h4>
              <p className="text-xs text-gray-600">පාඨමාලා ගාස්තුව ({classroom?.courseFee || 'Free'}) පහත ගිණුමට බැංකුගත කරන්න:</p>
              <div className="bg-white p-4 rounded-xl border border-indigo-100 text-xs space-y-1 font-medium text-navy-900">
                <p><strong>Bank Name:</strong> BOC</p>
                <p><strong>Branch:</strong> Nugegoda</p>
                <p><strong>Account Number:</strong> 9855111</p>
                <p><strong>Account Name:</strong> TASP Deshapriya</p>
              </div>
            </div>

            <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center font-bold justify-center">2</div>
              <h4 className="font-bold text-navy-900 text-lg">ස්ලිප් එක WhatsApp වෙත එවන්න සහ ලියාපදිංචි වන්න</h4>
              <p className="text-xs text-gray-600">මුදල් ගෙවූ බිල්පත (Slip) WhatsApp වෙත එවන්න. ඉන්පසු ඔබට ලැබෙන රහස් කේතය (Access Code) යොදා පහතින් ලියාපදිංචි වන්න.</p>
              <div className="pt-2 flex flex-col gap-2">
                <a
                  href="https://wa.me/94742052343"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-center text-xs shadow transition flex items-center justify-center gap-2"
                >
                  Send Slip via WhatsApp (94742052343)
                </a>
                <button
                  type="button"
                  onClick={() => setShowRegModal(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-center text-xs shadow transition flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" /> Register with Access Code (ලියාපදිංචි වන්න)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Benefits Section & Modules */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-sm space-y-8">
        <div className="space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-extrabold text-navy-900">මෙම පාඨමාලාවෙන් ඔබට ලැබෙන විශේෂ ප්‍රතිලාභ</h3>
              <p className="text-xs text-gray-500">Course Benefits & Key Takeaways</p>
            </div>
            <Award className="w-7 h-7 text-amber-600" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(classroom?.benefits || DEFAULT_COURSE_BENEFITS).map((benefit, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-navy-900">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-extrabold text-navy-900">Course Content & Modules (පාඨමාලා අන්තර්ගතය)</h3>
              <p className="text-xs text-gray-500">මෙම පාඨමාලාව යටතේ ආවරණය වන මොඩියුල.</p>
            </div>
            <BookOpen className="w-7 h-7 text-indigo-600" />
          </div>

          {courseModules.length === 0 ? (
            <div className="p-6 text-center bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-500">
              මෙම පාඨමාලාව සඳහා මොඩියුල තවදුරටත් ඇතුළත් කර නැත.
            </div>
          ) : (
            <div className="space-y-3">
              {courseModules.map((mod, index) => (
                <div key={mod.id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-navy-900 text-sm">{mod.title}</h4>
                      <p className="text-[11px] text-gray-500">Module {mod.position} Content</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      {/* ADMIN POPUP: Attendance Logs Table */}
      {showAttendanceTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setShowAttendanceTableModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-extrabold text-navy-900 mb-2">Class Attendance Logs ({classroom?.attendance?.length || 0})</h3>
            <p className="text-xs text-gray-500 mb-4">සිසුන් විසින් සටහන් කරන ලද පැමිණීම් වාර්තා.</p>

            <div className="overflow-x-auto flex-1 border border-gray-200 rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-bold text-navy-700">
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Attendance Date</th>
                    <th className="p-3">Marked Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!classroom?.attendance || classroom.attendance.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-gray-500">No attendance records found yet.</td></tr>
                  ) : (
                    classroom.attendance.map((att, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-navy-900">{att.studentName}</td>
                        <td className="p-3 font-mono text-xs">{att.studentEmail}</td>
                        <td className="p-3 font-semibold text-emerald-700">{att.date}</td>
                        <td className="p-3 text-xs text-gray-500">{att.timestamp}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN POPUP: Pre-Session Viewers Table */}
      {showViewersTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setShowViewersTableModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-extrabold text-navy-900 mb-2">Pre-Session Viewers ({classroom?.preSessionViewers?.length || 0})</h3>
            <p className="text-xs text-gray-500 mb-4">සැසිය නැරඹූ අයගේ නම, දුරකථන අංකය සහ බැලූ වේලාව.</p>

            <div className="overflow-x-auto flex-1 border border-gray-200 rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-bold text-navy-700">
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Phone Number</th>
                    <th className="p-3">Viewed Time</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!classroom?.preSessionViewers || classroom.preSessionViewers.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-gray-500">No pre-session viewer records found.</td></tr>
                  ) : (
                    classroom.preSessionViewers.map((v, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-navy-900">{v.name}</td>
                        <td className="p-3 font-mono">{v.phone}</td>
                        <td className="p-3">{v.time}</td>
                        <td className="p-3 font-semibold text-emerald-700">{v.durationWatched}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REGISTRATION FORM MODAL WITH ACCESS CODE & USERNAME/PASSWORD SETUP */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative my-8 space-y-6">
            <button
              type="button"
              onClick={() => { setShowRegModal(false); setCodeVerified(false); setInputAccessCode(''); }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>

            <div>
              <h3 className="text-2xl font-extrabold text-navy-900">Student Course Registration & Login Setup</h3>
              <p className="text-xs text-gray-500 mt-1">මුදල් ගෙවීමෙන් පසු ඔබට ලැබුණු රහස් කේතය (Access Code) ඇතුළත් කර ලියාපදිංචි වන්න.</p>
            </div>

            {error && <Alert tone="error">{error}</Alert>}

            {!codeVerified ? (
              <form onSubmit={handleVerifyAccessCode} className="space-y-4 py-4">
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                  <label className="label font-bold text-navy-900 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-600" /> Enter Payment Access Code (රහස් කේතය ඇතුළත් කරන්න)
                  </label>
                  <input
                    className="input font-mono font-bold bg-white text-lg tracking-wider text-center"
                    value={inputAccessCode}
                    onChange={(e) => setInputAccessCode(e.target.value)}
                    placeholder="e.g. WD-180-XYZ"
                    required
                  />
                  <p className="text-[11px] text-gray-600">ඔබගේ ගෙවීම තහවුරු වීමෙන් පසු අප විසින් ඔබට ලබා දුන් කේතය මෙහි ටයිප් කරන්න.</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowRegModal(false); setInputAccessCode(''); }} className="btn-secondary px-6 py-2.5 text-sm">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary px-8 py-2.5 text-sm">
                    Verify Code & Continue
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegistrationSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Access Code verified successfully! Now complete your registration details and login credentials.</span>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <div>
                    <label className="label font-semibold text-gray-700">Create Username (යූසර් නේම්)</label>
                    <input
                      className="input mt-1 bg-white font-mono"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="e.g. john_180"
                      required
                    />
                  </div>
                  <div>
                    <label className="label font-semibold text-gray-700">Create Password (පාස්වර්ඩ් එක)</label>
                    <input
                      type="password"
                      className="input mt-1 bg-white font-mono"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label font-semibold text-gray-700">Title</label>
                    <select
                      className="input mt-1"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value as any })}
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Miss">Miss</option>
                      <option value="Dr">Dr</option>
                    </select>
                  </div>
                  <div>
                    <label className="label font-semibold text-gray-700">Marital Status</label>
                    <select
                      className="input mt-1"
                      value={formData.maritalStatus}
                      onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as any })}
                    >
                      <option value="Unmarried">Unmarried</option>
                      <option value="Married">Married</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label font-semibold text-gray-700">Full Name</label>
                  <input
                    className="input mt-1"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label font-semibold text-gray-700">Date of Birth (DOB)</label>
                    <input
                      type="date"
                      className="input mt-1"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label font-semibold text-gray-700">National ID (NIC / Passport)</label>
                    <input
                      className="input mt-1"
                      value={formData.nic}
                      onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                      placeholder="e.g. 199012345678"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label font-semibold text-gray-700">Residential Address</label>
                  <textarea
                    rows={2}
                    className="input mt-1 resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="House No, Street, City"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label font-semibold text-gray-700">Phone Number</label>
                    <input
                      type="tel"
                      className="input mt-1"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0771234567"
                      required
                    />
                  </div>
                  <div>
                    <label className="label font-semibold text-gray-700">WhatsApp Number</label>
                    <input
                      type="tel"
                      className="input mt-1"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="0771234567"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label font-semibold text-gray-700">Email Address</label>
                  <input
                    type="email"
                    className="input mt-1"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label font-semibold text-gray-700">Current Occupation</label>
                    <input
                      className="input mt-1"
                      value={formData.occupation}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                      placeholder="e.g. Engineer / Businessman"
                      required
                    />
                  </div>
                  <div>
                    <label className="label font-semibold text-gray-700">Investment Goal / Purpose</label>
                    <input
                      className="input mt-1"
                      value={formData.investmentGoal}
                      onChange={(e) => setFormData({ ...formData, investmentGoal: e.target.value })}
                      placeholder="e.g. Stock market retirement planning"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button type="button" onClick={() => { setShowRegModal(false); setCodeVerified(false); }} className="btn-secondary px-6 py-2.5 text-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingReg} className="btn-primary px-8 py-2.5 text-sm">
                    {submittingReg ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Registration'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADMIN POPUP: Registered Students Table */}
      {showRegTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setShowRegTableModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-extrabold text-navy-900 mb-4">Registered Students ({classroom?.registeredStudents?.length || 0})</h3>

            <div className="overflow-x-auto flex-1 border border-gray-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-bold text-navy-700">
                    <th className="p-3">Name</th>
                    <th className="p-3">Username</th>
                    <th className="p-3">Title / Marital</th>
                    <th className="p-3">NIC</th>
                    <th className="p-3">Phone / WhatsApp</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Occupation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {classroom?.registeredStudents?.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-gray-500">No student registrations recorded yet.</td></tr>
                  ) : (
                    classroom?.registeredStudents?.map((s, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-navy-900">{s.fullName}</td>
                        <td className="p-3 font-mono text-indigo-600 font-semibold">{s.username || 'N/A'}</td>
                        <td className="p-3">{s.title}, {s.maritalStatus}</td>
                        <td className="p-3 font-mono">{s.nic}</td>
                        <td className="p-3">{s.phone} / {s.whatsapp}</td>
                        <td className="p-3">{s.email}</td>
                        <td className="p-3">{s.occupation}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}