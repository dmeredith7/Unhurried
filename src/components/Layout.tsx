import { CalendarDays, Flag, ListTodo, Settings, Sun, Timer } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Today', Icon: Sun, end: true },
  { to: '/tasks', label: 'Tasks', Icon: ListTodo },
  { to: '/focus', label: 'Focus', Icon: Timer },
  { to: '/week', label: 'Unschedule', short: 'Week', Icon: CalendarDays },
  { to: '/goals', label: 'Goals', Icon: Flag },
];

export function Layout() {
  return (
    <div className="min-h-dvh md:flex">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-3">
          <img src="/icon.svg" alt="" className="size-7" />
          <span className="text-lg font-semibold tracking-tight">Now Habit</span>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  isActive ? 'bg-accent-soft font-medium text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          <div className="flex-1" />
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                isActive ? 'bg-accent-soft font-medium text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'
              }`
            }
          >
            <Settings className="size-5" aria-hidden="true" />
            Settings
          </NavLink>
        </nav>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <div className="flex h-14 items-center gap-2">
          <img src="/icon.svg" alt="" className="size-6" />
          <span className="font-semibold tracking-tight">Now Habit</span>
        </div>
        <NavLink
          to="/settings"
          aria-label="Settings"
          className={({ isActive }) =>
            `inline-flex size-10 items-center justify-center rounded-xl ${
              isActive ? 'bg-accent-soft text-ink' : 'text-muted'
            }`
          }
        >
          <Settings className="size-5" aria-hidden="true" />
        </NavLink>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-28 md:px-10 md:pt-10 md:pb-12">
        <Outlet />
      </main>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV.map(({ to, label, short, Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex h-16 flex-col items-center justify-center gap-1 text-xs ${
                    isActive ? 'font-medium text-accent' : 'text-muted'
                  }`
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                {short ?? label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
