import { PageHeader } from '../components/ui';

export function ComingSoon({ title, phase, children }: { title: string; phase: number; children: React.ReactNode }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-3xl bg-surface p-6 text-muted shadow-[0_1px_0_var(--line)]">
        <p>{children}</p>
        <p className="mt-3 text-sm">Arriving in phase {phase}.</p>
      </div>
    </>
  );
}
