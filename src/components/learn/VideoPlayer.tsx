import { useRef, useState } from 'react';
import { Gauge, Video } from 'lucide-react';
import { Spinner } from '@/components/ui/Feedback';
import { useAsync } from '@/hooks/useAsync';
import { fetchLessonVideoUrl } from '@/lib/api/catalog';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

interface VideoPlayerProps {
  lessonId: string;
  title: string;
  onTimeChange: (seconds: number) => void;
}

export function VideoPlayer({ lessonId, title, onTimeChange }: VideoPlayerProps) {
  const video = useAsync(() => fetchLessonVideoUrl(lessonId), [lessonId]);
  const ref = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);

  const changeSpeed = (next: number) => {
    setSpeed(next);
    if (ref.current) ref.current.playbackRate = next;
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-navy-950 shadow-lift">
      <div className="relative aspect-video w-full">
        {video.loading && (
          <div className="flex h-full items-center justify-center">
            <Spinner label="Loading recording" className="text-navy-200" />
          </div>
        )}
        {video.error && (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-200">{video.error}</div>
        )}
        {!video.loading && !video.error && video.data === null && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-emerald-300">
              <Video className="h-7 w-7" />
            </span>
            <p className="font-semibold text-white">Recording coming soon</p>
            <p className="max-w-sm text-sm text-navy-300">The instructor has not published a recording for this lesson yet.</p>
          </div>
        )}
        {video.data && (
          <video
            key={video.data}
            ref={ref}
            src={video.data}
            controls
            preload="metadata"
            className="h-full w-full bg-black"
            aria-label={title}
            onLoadedMetadata={() => {
              if (ref.current) ref.current.playbackRate = speed;
            }}
            onTimeUpdate={(e) => onTimeChange(e.currentTarget.currentTime)}
          />
        )}
      </div>
      {video.data && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3">
          <span className="mr-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-navy-300">
            <Gauge className="h-4 w-4" /> Speed
          </span>
          {SPEEDS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => changeSpeed(option)}
              aria-pressed={speed === option}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                speed === option ? 'bg-emerald-500 text-white' : 'text-navy-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              {option}x
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
