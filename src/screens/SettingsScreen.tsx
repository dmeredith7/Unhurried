import { ChevronRight, Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SpaceEditor } from '../components/SpaceEditor';
import { TaskEditor } from '../components/TaskEditor';
import { DataCard } from '../components/DataCard';
import { BreakIdeasEditor } from '../components/BreakIdeasEditor';
import { Button, PageHeader, Segmented, Toggle, inputClass } from '../components/ui';
import { useSettings, useSpaces, useTasks, useTemplates } from '../data/hooks';
import * as repos from '../data/repos';
import type { Space, Template, ThemePref } from '../data/types';
import { SpaceBadge } from '../lib/spaceStyle';

const BLOCK_OPTIONS = [15, 20, 25, 30, 45, 50, 60, 90];

export function SettingsScreen() {
  const settings = useSettings();
  const spaces = useSpaces() ?? [];
  const tasks = useTasks() ?? [];
  const [editing, setEditing] = useState<Space | null | 'new'>(null);
  const templates = useTemplates() ?? [];
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);

  const set = repos.settings.update;
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <>
      <PageHeader title="Settings" />

      <Card title="Spaces" description="Group your tasks the way your life is organized.">
        <ul className="divide-y divide-line">
          {spaces.map((s) => {
            const count = tasks.filter((t) => t.spaceId === s.id && t.status === 'open').length;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  className="flex w-full items-center gap-3 py-3 text-left"
                  aria-label={`Edit space ${s.name}`}
                >
                  <SpaceBadge color={s.color} icon={s.icon} />
                  <span className="flex-1">
                    <span className="block font-medium">{s.name}</span>
                    <span className="text-sm text-muted">
                      {count} open {count === 1 ? 'task' : 'tasks'}
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-muted" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <Button className="mt-3" onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden="true" />
          New space
        </Button>
      </Card>

      <Card title="Templates" description="Reusable tasks with preset steps, like a weekly clean.">
        {templates.length > 0 && (
          <ul className="divide-y divide-line">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setEditingTemplate(t)}
                  className="flex w-full items-center gap-3 py-3 text-left"
                  aria-label={`Edit template ${t.name}`}
                >
                  <span className="flex-1">
                    <span className="block font-medium">{t.name}</span>
                    <span className="text-sm text-muted">
                      {t.subtasks.length} {t.subtasks.length === 1 ? 'step' : 'steps'}
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-muted" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button className="mt-3" onClick={() => setEditingTemplate({})}>
          <Plus className="size-4" aria-hidden="true" />
          New template
        </Button>
      </Card>

      <Card title="Focus blocks">
        <div className="flex items-center justify-between gap-4 py-3">
          <label htmlFor="block-length" className="font-medium">
            Block length
          </label>
          <select
            id="block-length"
            className={`${inputClass} !w-auto`}
            value={settings.blockMinutes}
            onChange={(e) => set({ blockMinutes: Number(e.target.value) })}
          >
            {BLOCK_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} minutes{m === 30 ? ' (recommended)' : ''}
              </option>
            ))}
          </select>
        </div>
        <Toggle
          label="Flow warm-up"
          description="A 2-minute breathing and focus moment before each block. You can always skip it."
          checked={settings.warmUp}
          onChange={(v) => set({ warmUp: v })}
        />
        <Toggle
          label="Sound"
          description="A soft chime when a block ends."
          checked={settings.sound}
          onChange={(v) => set({ sound: v })}
        />
        <Toggle
          label="Notifications"
          description="Let you know a block has ended, even when the tab is in the background."
          checked={settings.notifications}
          onChange={(v) => set({ notifications: v })}
        />
        <Toggle
          label="Reframing prompts"
          description='Gentle reminders like "I choose to" instead of "I have to".'
          checked={settings.reframes}
          onChange={(v) => set({ reframes: v })}
        />
      </Card>

      <Card
        id="break-ideas"
        title="Break ideas"
        description="Rewards suggested after each focus block. Make them things you genuinely enjoy."
      >
        <BreakIdeasEditor />
      </Card>

      <Card title="Appearance and calendar">
        <div className="space-y-4 py-2">
          <Segmented<ThemePref>
            label="Theme"
            value={settings.theme}
            onChange={(v) => set({ theme: v })}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <Segmented<'0' | '1'>
            label="Week starts on"
            value={String(settings.weekStartsOn) as '0' | '1'}
            onChange={(v) => set({ weekStartsOn: Number(v) as 0 | 1 })}
            options={[
              { value: '1', label: 'Monday' },
              { value: '0', label: 'Sunday' },
            ]}
          />
        </div>
      </Card>

      <Card title="Your data" description="Everything is stored privately in this browser on this device.">
        <DataCard />
      </Card>

      <Card title="Help">
        <Link
          to="/welcome"
          className="flex items-center justify-between py-3 font-medium"
        >
          Getting started guide
          <ChevronRight className="size-5 text-muted" aria-hidden="true" />
        </Link>
      </Card>

      <TaskEditor
        mode="template"
        open={editingTemplate !== null}
        template={editingTemplate}
        onClose={() => setEditingTemplate(null)}
      />

      <SpaceEditor
        open={editing !== null}
        space={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function Card({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mb-6 scroll-mt-20 rounded-3xl bg-surface p-5 shadow-[0_1px_0_var(--line)]">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="text-sm text-muted">{description}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}
