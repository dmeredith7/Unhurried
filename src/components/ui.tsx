import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-[15px]';
  const variants: Record<Variant, string> = {
    primary: 'bg-accent text-accent-ink hover:opacity-90',
    secondary: 'bg-surface-2 text-ink hover:bg-line',
    ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  };
  return (
    <button
      type="button"
      className={`${base} ${sizes} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({
  label,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-ink ${className}`}
      {...props}
    />
  );
}

export const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-accent/30';

/** A labelled form field; passes a generated id to the child render prop. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/30 transition-opacity duration-200 data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6">
        <DialogPanel
          transition
          className="flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-surface shadow-xl transition duration-200 data-closed:translate-y-6 data-closed:opacity-0 sm:max-w-lg sm:rounded-3xl"
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <IconButton label="Close" onClick={onClose}>
              <X className="size-5" aria-hidden="true" />
            </IconButton>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          {footer && (
            <div className="flex gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Chip({
  selected,
  children,
  onClick,
  color,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors ${
        selected
          ? 'border-transparent bg-ink text-bg'
          : 'border-line bg-surface text-ink hover:bg-surface-2'
      }`}
    >
      {color && (
        <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

/** Segmented single-choice control, keyboard accessible as a radio group. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex rounded-xl bg-surface-2 p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-center text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
              value === o.value ? 'bg-surface font-medium shadow-sm' : 'text-muted'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}
