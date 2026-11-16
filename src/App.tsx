import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useSettings } from './data/hooks';
import { seedIfFirstRun } from './data/seed';
import { useApplyTheme } from './lib/theme';
import { ComingSoon } from './screens/ComingSoon';
import { SettingsScreen } from './screens/SettingsScreen';
import { TasksScreen } from './screens/TasksScreen';
import { TodayScreen } from './screens/TodayScreen';

export default function App() {
  const settings = useSettings();
  useApplyTheme(settings.theme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedIfFirstRun()
      .catch((e) => console.error('Could not set up sample data', e))
      .finally(() => setReady(true));
    // Ask the browser to keep our storage even under pressure (best effort).
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  if (!ready) return null;

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TodayScreen />} />
          <Route path="tasks" element={<TasksScreen />} />
          <Route
            path="focus"
            element={
              <ComingSoon title="Focus" phase={3}>
                The focus timer, flow warm-up, block ratings and reward breaks live here.
              </ComingSoon>
            }
          />
          <Route
            path="week"
            element={
              <ComingSoon title="Unschedule" phase={4}>
                Your week, with leisure planned first and real work filling in as you do it.
              </ComingSoon>
            }
          />
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
    </BrowserRouter>
  );
}
