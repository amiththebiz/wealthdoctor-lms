import { useState, useEffect } from 'react';
import { Users, Calendar, Clock, DollarSign, Edit3, Trash2, Copy, Check, Eye, ExternalLink } from 'lucide-react';
import { Alert } from '@/components/ui/Feedback';
import { errorMessage } from '@/lib/errors';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
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
  preSessionVideo: string;
  registeredCount?: number; 
  paidCount?: number;      
}

export function ClassroomsAdminTablePage() {
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchClassrooms = async () => {
    setLoading(true);
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
          registeredCount: (data.registeredStudents || []).length,
          paidCount: (data.paymentSubmissions || []).filter((p: any) => p.status === 'approved').length,
        };
      });
      setClassrooms(list);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load classrooms.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-navy-900">Classrooms & Batches Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">View all ongoing/ended batches, student registrations, and manage lessons.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
            Total Batches: {classrooms.length}
          </span>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading classrooms...</div>
        ) : classrooms.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No classrooms created yet. Use the creation panel to add batches.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-bold text-navy-700 uppercase tracking-wider">
                  <th className="py-4 px-6">Batch & Course</th>
                  <th className="py-4 px-6">Status & Schedule</th>
                  <th className="py-4 px-6">Fee</th>
                  <th className="py-4 px-6 text-center">Pre-Session Registered</th>
                  <th className="py-4 px-6 text-center">Paid Enrolled</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {classrooms.map((item) => {
                  const status = getStatus(item.courseDates);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                            {item.batchNumber}
                          </span>
                          <span className="font-bold text-navy-900">{item.courseName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center w-max px-2 py-0.5 rounded text-xs font-semibold ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {item.courseTime || 'Time not set'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-navy-800">
                        {item.courseFee || 'Free'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                          <Users className="w-3.5 h-3.5" /> {item.registeredCount || 0} Students
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                          <DollarSign className="w-3.5 h-3.5" /> {item.paidCount || 0} Paid
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* VIEW CLASSROOM BUTTON */}
                          <button
                            type="button"
                            onClick={() => navigate(`/classroom/${item.id}`)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center gap-1.5 shadow transition cursor-pointer"
                            title="Open Classroom Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View Classroom
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(item.id)}
                            className="p-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                            title="Copy Student Link"
                          >
                            {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
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
  );
}