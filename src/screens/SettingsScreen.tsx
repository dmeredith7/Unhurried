import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { SpaceEditor } from '../components/SpaceEditor';
import { Button, PageHeader, Segmented, Toggle, inputClass } from '../components/ui';
import { useSettings, useSpaces, useTasks } from '../data/hooks';
import * as repos from '../data/repos';
import { clearSampleData, hasSampleData } from '../data/seed';
import type { Space, ThemePref } from '../data/types';
import { SpaceBadge } from '../lib/spaceStyle';

const BLOCK_OPTIONS = [15, 20, 25, 30, 45, 50, 60, 90];

export function SettingsScreen() {
  const settings = useSettings();
  const spaces = useSpaces() ?? [];
  const tasks = useTasks() ?? [];
  const sample = useLiveQuery(() => hasSampleData(), []);
  const [editing, setEditing] = useState<Space | null | 'new'>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  const set = repos.settings.update;

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

      {(sample || cleared) && (
        <Card title="Sample setup">
          {cleared ? (
            <p className="py-2 text-muted" role="status">
              Sample data cleared. The space is all yours.
            </p>
          ) : (
            <>
              <p className="py-2 text-sm text-muted">
                The app started with example spaces and tasks. Clearing removes them. Anything you
                created yourself stays, including tasks you added to a sample space.
              </p>
              {confirmClear ? (
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={async () => {
                      await clearSampleData();
                      setConfirmClear(false);
                      setCleared(true);
                    }}
                  >
                    Clear sample data
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmClear(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setConfirmClear(true)}>Clear sample data</Button>
              )}
            </>
          )}
        </Card>
      )}

      <SpaceEditor
        open={editing !== null}
        space={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-3xl bg-surface p-5 shadow-[0_1px_0_var(--line)]">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="text-sm text-muted">{description}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}
