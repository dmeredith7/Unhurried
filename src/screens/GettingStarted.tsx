import { CalendarDays, Check, Flag, Heart, ListTodo, Sprout, Timer, Gem } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, inputClass } from '../components/ui';
import { completeOnboarding, STARTER_SPACES } from '../data/setup';
import { SpaceBadge } from '../lib/spaceStyle';

/**
 * Brief first-visit guide. With `revisit`, it's opened from Settings and only
 * explains (no setup step).
 */
export function GettingStarted({ revisit = false }: { revisit?: boolean }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>(['work', 'home']);
  const [custom, setCustom] = useState('');
  const [firstTask, setFirstTask] = useState('');
  const [busy, setBusy] = useState(false);

  const steps = revisit ? ['welcome', 'how'] : ['welcome', 'how', 'spaces', 'first'];
  const last = step === steps.length - 1;

  async function finish(withTask: boolean) {
    if (revisit) {
      navigate('/');
      return;
    }
    setBusy(true);
    await completeOnboarding({
      spaceKeys: picked,
      customSpace: custom,
      firstTask: withTask ? firstTask : undefined,
    });
    navigate('/');
  }

  const toggle = (key: string) =>
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="size-7" />
            <span className="text-lg font-semibold tracking-tight">Unhurried</span>
          </div>
          <ol className="flex gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((s, i) => (
              <li
                key={s}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-accent' : 'w-1.5 bg-line'}`}
              />
            ))}
          </ol>
        </div>

        <main className="flex-1" aria-live="polite">
          {steps[step] === 'welcome' && (
            <>
              <h1 className="text-3xl font-semibold tracking-tight">Welcome to Unhurried</h1>
              <p className="mt-3 text-lg text-muted">
                Putting things off isn't laziness. It's usually a way of protecting ourselves from pressure,
                overwhelm or fear of not doing it well. Unhurried is built to make starting feel safe.
              </p>
              <ul className="mt-8 space-y-4">
                <Principle icon={<Sprout className="size-5" />} title="Start small">
                  One 30-minute block is enough. You don't have to finish, just begin.
                </Principle>
                <Principle icon={<Gem className="size-5" />} title="Quality over hours">
                  Short blocks of real focus count for more than long hours of struggle.
                </Principle>
                <Principle icon={<Heart className="size-5" />} title="Play comes first">
                  Plan guilt-free time for rest and fun first. Work fits around it.
                </Principle>
              </ul>
              <p className="mt-8 text-sm text-muted">Inspired by Neil Fiore's book <cite>The Now Habit</cite>.</p>
            </>
          )}

          {steps[step] === 'how' && (
            <>
              <h1 className="text-3xl font-semibold tracking-tight">How it works</h1>
              <ul className="mt-6 space-y-4">
                <Principle icon={<ListTodo className="size-5" />} title="Today and Tasks">
                  Keep tasks in your own spaces, like Work or Home. Tap the sun to bring one into today.
                </Principle>
                <Principle icon={<Timer className="size-5" />} title="Focus">
                  Start a 30-minute block with an optional 2-minute warm-up. Afterward, rate how it went and take a
                  reward break.
                </Principle>
                <Principle icon={<CalendarDays className="size-5" />} title="Unschedule">
                  Fill in your week with leisure and commitments first. Your real work fills in as you do it.
                </Principle>
                <Principle icon={<Flag className="size-5" />} title="Goals">
                  Work backward from a deadline until you reach a small step you can take today.
                </Principle>
              </ul>
              <div className="mt-8 rounded-2xl bg-accent-soft p-4 text-[15px]">
                Nothing here will scold you. There are no streaks, and missed days aren't counted. Your data stays
                private in this browser.
              </div>
            </>
          )}

          {steps[step] === 'spaces' && (
            <>
              <h1 className="text-3xl font-semibold tracking-tight">Where does your work live?</h1>
              <p className="mt-3 text-muted">Pick a few spaces to start. You can rename, add or remove them anytime.</p>
              <div className="mt-6 grid grid-cols-2 gap-2" role="group" aria-label="Starting spaces">
                {STARTER_SPACES.map((s) => {
                  const on = picked.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(s.key)}
                      className={`flex items-center gap-3 rounded-2xl border-2 bg-surface px-3 py-3 text-left transition-colors ${
                        on ? 'border-accent' : 'border-transparent'
                      }`}
                    >
                      <SpaceBadge color={s.color} icon={s.icon} />
                      <span className="flex-1 font-medium">{s.name}</span>
                      {on && <Check className="size-5 text-accent" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              <label htmlFor="custom-space" className="mt-5 block text-sm font-medium">
                Something else?
              </label>
              <input
                id="custom-space"
                className={`${inputClass} mt-1.5`}
                placeholder="e.g. Garden, Band, Volunteering"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            </>
          )}

          {steps[step] === 'first' && (
            <>
              <h1 className="text-3xl font-semibold tracking-tight">When can you start?</h1>
              <p className="mt-3 text-muted">
                Think of one small thing you could start today. Not the whole project, just a first step that would
                take less than 30 minutes.
              </p>
              <label htmlFor="first-task" className="mt-6 block text-sm font-medium">
                My first small step
              </label>
              <input
                id="first-task"
                className={`${inputClass} mt-1.5`}
                placeholder="e.g. Open the document and write one sentence"
                value={firstTask}
                onChange={(e) => setFirstTask(e.target.value)}
                autoFocus
              />
              <p className="mt-2 text-sm text-muted">It will be waiting for you in Today. You can skip this.</p>
            </>
          )}
        </main>

        <div className="mt-8 flex items-center gap-2">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            !revisit && (
              <Button variant="ghost" onClick={() => setStep(steps.indexOf('spaces'))}>
                Skip intro
              </Button>
            )
          )}
          <div className="flex-1" />
          {!last && (
            <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          )}
          {last && revisit && (
            <Button variant="primary" onClick={() => finish(false)}>
              Back to the app
            </Button>
          )}
          {last && !revisit && (
            <>
              {!firstTask.trim() && (
                <Button variant="ghost" onClick={() => finish(false)} disabled={busy}>
                  Skip
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => finish(true)}
                disabled={busy || !firstTask.trim()}
              >
                Let's begin
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Principle({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-[15px] text-muted">{children}</p>
      </div>
    </li>
  );
}
