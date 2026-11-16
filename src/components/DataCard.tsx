import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  BackupError,
  backupFileName,
  exportAll,
  importBackup,
  parseBackup,
  summarize,
  type Backup,
} from '../data/backup';
import * as repos from '../data/repos';
import { Button } from './ui';

const LAST_EXPORT = 'lastExportedAt';

export function DataCard() {
  const lastExport = useLiveQuery(() => repos.meta.get<number>(LAST_EXPORT), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; backup: Backup } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doExport() {
    const backup = await exportAll();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    await repos.meta.set(LAST_EXPORT, Date.now());
    setMessage('Backup downloaded.');
    setError(null);
  }

  async function onFile(file: File | undefined) {
    setMessage(null);
    setError(null);
    if (!file) return;
    try {
      const backup = parseBackup(JSON.parse(await file.text()));
      setPending({ name: file.name, backup });
    } catch (e) {
      setError(e instanceof BackupError ? e.message : "That file couldn't be read as a backup.");
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function confirm(mode: 'replace' | 'merge') {
    if (!pending) return;
    try {
      await importBackup(pending.backup, mode);
      setMessage(mode === 'replace' ? 'Backup restored.' : 'Backup merged with your current data.');
      setPending(null);
    } catch {
      setError('Something went wrong while importing. Your existing data was not changed.');
    }
  }

  const days = lastExport ? Math.floor((Date.now() - lastExport) / 86_400_000) : null;

  return (
    <div className="space-y-4 py-2">
      <p className="text-sm text-muted">
        {lastExport
          ? `Last backup: ${days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}.`
          : 'No backup yet.'}{' '}
        A backup file lets you move to another browser or device, or restore if this browser's data is
        cleared.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={doExport}>
          <Download className="size-4" aria-hidden="true" />
          Export backup
        </Button>
        <Button onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" aria-hidden="true" />
          Import backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a backup file"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      {pending && (
        <div className="space-y-3 rounded-2xl bg-surface-2 p-4">
          <p className="font-medium">Ready to import "{pending.name}"</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted">
            {summarize(pending.backup).map((r) => (
              <li key={r.label}>
                {r.label}: <span className="text-ink tabular-nums">{r.count}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Merge</strong> keeps everything you have here and adds what's in the file. Where both have
              the same item, the most recently changed copy wins.
            </p>
            <p>
              <strong>Replace</strong> makes this browser match the file exactly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => confirm('merge')}>
              Merge
            </Button>
            <Button onClick={() => confirm('replace')}>Replace</Button>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className="text-sm text-accent">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
