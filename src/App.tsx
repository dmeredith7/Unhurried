import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useSettings } from './data/hooks';
import { ensureDefaults, isOnboarded } from './data/setup';
import { GettingStarted } from './screens/GettingStarted';
import { useApplyTheme } from './lib/theme';
import { ComingSoon } from './screens/ComingSoon';
import { FocusScreen } from './screens/FocusScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { TimerProvider } from './components/TimerProvider';
import { SettingsScreen } from './screens/SettingsScreen';
import { TasksScreen } from './screens/TasksScreen';
import { TodayScreen } from './screens/TodayScreen';

export default function App() {
  const settings = useSettings();
  useApplyTheme(settings.theme);
  const [ready, setReady] = useState(false);
  const onboarded = useLiveQuery(() => isOnboarded(), []);

  useEffect(() => {
    ensureDefaults()
      .catch((e) => console.error('Could not set up defaults', e))
      .finally(() => setReady(true));
    // Ask the browser to keep our storage even under pressure (best effort).
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  if (!ready || onboarded === undefined) return null;

  return (
    <TimerProvider>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {!onboarded ? (
        <GettingStarted />
      ) : (
      <Routes>
        <Route path="welcome" element={<GettingStarted revisit />} />
        <Route element={<Layout />}>
          <Route index element={<TodayScreen />} />
          <Route path="tasks" element={<TasksScreen />} />
          <Route path="focus" element={<FocusScreen />} />
          <Route path="week" element={<ScheduleScreen />} />
          <Route
            path="goals"
            element={
              <ComingSoon title="Goals" phase={5}>
                Work backward from a deadline to a small first step you can take today.
              </ComingSoon>
            }
          />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="*" element={<TodayScreen />} />
        </Route>
      </Routes>
      )}
    </BrowserRouter>
    </TimerProvider>
  );
}
