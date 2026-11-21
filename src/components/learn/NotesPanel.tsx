import { useState, type FormEvent } from 'react';
import { Clock, NotebookPen } from 'lucide-react';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { useAsync } from '@/hooks/useAsync';
import { addLessonNote, fetchLessonNotes } from '@/lib/api/learning';
import { formatTimestamp } from '@/lib/format';
import { errorMessage } from '@/lib/errors';

const MAX_NOTE_LENGTH = 2000;

interface NotesPanelProps {
  lessonId: string;
  courseId: string;
  userId: string;
  currentSeconds: number;
}

export function NotesPanel({ lessonId, courseId, userId, currentSeconds }: NotesPanelProps) {
  const notes = useAsync(() => fetchLessonNotes(userId, lessonId), [userId, lessonId]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSaving(true);
    setError(null);
    try {
      await addLessonNote(userId, courseId, lessonId, body, currentSeconds);
      setDraft('');
      notes.reload();
    } catch (err) {
      setError(errorMessage(err, 'Your note could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card p-6">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-5 w-5 text-emerald-600" />
        <h3 className="text-base font-bold text-navy-900">My notes</h3>
      </div>

      <form onSubmit={onSubmit} className="mt-4">
        <label htmlFor="note" className="label">
          Note at {formatTimestamp(currentSeconds)}
        </label>
        <textarea
          id="note"
          rows={3}
          maxLength={MAX_NOTE_LENGTH}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Capture a key idea or question from this moment..."
          className="input resize-none"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-navy-400">{draft.length}/{MAX_NOTE_LENGTH}</span>
          <button type="submit" disabled={saving || !draft.trim()} className="btn-primary px-4 py-2">
            {saving ? 'Saving...' : 'Save note'}
          </button>
        </div>
      </form>

      {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}

      <div className="mt-6 space-y-3">
        {notes.loading && <Spinner label="Loading notes" />}
        {notes.error && <Alert tone="error">{notes.error}</Alert>}
        {notes.data?.length === 0 && <p className="text-sm text-navy-500">No notes yet for this lesson.</p>}
        {notes.data?.map((note) => (
          <article key={note.id} className="rounded-xl border border-navy-100 bg-navy-50/50 p-4">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700 shadow-sm">
              <Clock className="h-3 w-3" /> {formatTimestamp(note.video_seconds)}
            </span>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-navy-700">{note.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
