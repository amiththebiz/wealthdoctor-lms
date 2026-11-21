import { useState } from 'react';
import { CheckCircle2, ChevronDown, Circle, PanelLeftClose, PanelLeftOpen, PlayCircle } from 'lucide-react';
import type { Lesson, Module } from '@/lib/types';
import { formatMinutes } from '@/lib/format';

interface CurriculumSidebarProps {
  modules: Module[];
  lessons: Lesson[];
  selectedId: string | null;
  completed: Set<string>;
  onSelect: (lessonId: string) => void;
}

export function CurriculumSidebar({ modules, lessons, selectedId, completed, onSelect }: CurriculumSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [closedModules, setClosedModules] = useState<Set<string>>(new Set());
  const total = lessons.length;
  const done = lessons.filter((l) => completed.has(l.id)).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  const toggleModule = (id: string) =>
    setClosedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (collapsed) {
    return (
      <aside className="hidden shrink-0 border-r border-navy-100 bg-white p-3 lg:block">
        <button type="button" onClick={() => setCollapsed(false)} className="btn-ghost px-2" aria-label="Expand course outline">
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-navy-100 bg-white lg:w-96 lg:border-b-0 lg:border-r">
      <div className="border-b border-navy-100 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy-900">Course outline</h2>
          <button type="button" onClick={() => setCollapsed(true)} className="btn-ghost hidden px-2 lg:inline-flex" aria-label="Collapse outline">
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs font-medium text-navy-500">
            <span>{done} of {total} lessons complete</span>
            <span className="font-semibold text-emerald-700">{percent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      <nav className="max-h-[40vh] overflow-y-auto lg:max-h-none lg:flex-1" aria-label="Lessons">
        {modules.map((module) => {
          const moduleLessons = lessons.filter((l) => l.module_id === module.id);
          const open = !closedModules.has(module.id);
          return (
            <div key={module.id} className="border-b border-navy-100 last:border-b-0">
              <button
                type="button"
                onClick={() => toggleModule(module.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-navy-50/60"
              >
                <span className="text-sm font-semibold text-navy-800">
                  Module {module.position}: {module.title}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-navy-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <ul className="pb-2 animate-fade-in">
                  {moduleLessons.map((lesson) => {
                    const active = lesson.id === selectedId;
                    const isDone = completed.has(lesson.id);
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(lesson.id)}
                          aria-current={active ? 'true' : undefined}
                          className={`flex w-full items-start gap-3 px-5 py-2.5 text-left transition ${
                            active ? 'bg-emerald-50' : 'hover:bg-navy-50/60'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          ) : active ? (
                            <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm leading-snug ${active ? 'font-semibold text-navy-900' : 'text-navy-700'}`}>
                              {lesson.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-navy-400">
                              {formatMinutes(lesson.duration_minutes)}
                              {lesson.is_preview && <span className="ml-2 font-semibold text-emerald-600">Preview</span>}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
