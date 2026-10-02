import { useEffect, useMemo, useState } from 'react';
import Navigation from './components/Navigation';
import Header from './components/Header';
import HabitGrid from './components/HabitGrid';
import ProgressChart from './components/ProgressChart';
import AnalysisPanel from './components/AnalysisPanel';
import HabitualStats from './components/HabitualStats';
import DailyProgress from './components/DailyProgress';
import WeeklyProgress from './components/WeeklyProgress';
import AddHabitModal from './components/AddHabitModal';
import MentalStateChart from './components/MentalStateChart';
import SettingsPage from './components/Settings';
import WorkoutLog from './pages/WorkoutLog';
import FoodLog from './pages/FoodLog';
import SkillsLog from './pages/SkillsLog';
import Analytics from './pages/Analytics';
import { getAllDays } from './utils/dateUtils';
import {
  overallStats,
  dailyCompletionSeries,
  weeklyCompletionStats,
  habitRanking,
  bestAndWorstHabit,
  currentStreak,
  habitCompletionCount,
  habitCompletionPercent,
} from './utils/habitAnalytics';
import {
  loadData,
  saveData,
  clearData,
  exportData,
  importDataFromFile,
  createDemoHabits,
  createDemoMentalState,
  createHabit,
  generateMentalStateSeries,
} from './utils/storage';

const NOW = new Date();

function buildInitialData() {
  const existing = loadData();
  if (existing) return existing;
  const year = NOW.getFullYear();
  const month = NOW.getMonth();
  return {
    habits: createDemoHabits(year, month),
    mentalState: createDemoMentalState(year, month),
  };
}

export default function App() {
  const [data, setData] = useState(buildInitialData);
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [modalHabit, setModalHabit] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mentalModalOpen, setMentalModalOpen] = useState(false);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const allDays = useMemo(() => getAllDays(year, month), [year, month]);

  function goPrevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }
  function goNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function toggleHabitDay(habitId, dateKey) {
    setData((prev) => ({
      ...prev,
      habits: prev.habits.map((h) =>
        h.id === habitId
          ? { ...h, completions: { ...h.completions, [dateKey]: !h.completions[dateKey] } }
          : h
      ),
    }));
  }

  function toggleMentalDay(habitId, dateKey) {
    setData((prev) => ({
      ...prev,
      mentalState: prev.mentalState.map((h) =>
        h.id === habitId
          ? { ...h, completions: { ...h.completions, [dateKey]: !h.completions[dateKey] } }
          : h
      ),
    }));
  }

  function handleSaveHabit(payload) {
    setData((prev) => {
      if (modalHabit) {
        return {
          ...prev,
          habits: prev.habits.map((h) =>
            h.id === modalHabit.id ? { ...h, ...payload } : h
          ),
        };
      }
      return { ...prev, habits: [...prev.habits, createHabit(payload.name, payload.color, payload.goal)] };
    });
    setModalOpen(false);
    setModalHabit(null);
  }

  function handleDeleteHabit(id) {
    if (!window.confirm('Delete this habit? This will remove all its tracked data.')) return;
    setData((prev) => ({ ...prev, habits: prev.habits.filter((h) => h.id !== id) }));
  }

  function handleReorder(fromIndex, toIndex) {
    setData((prev) => {
      const habits = [...prev.habits];
      const [moved] = habits.splice(fromIndex, 1);
      habits.splice(toIndex, 0, moved);
      return { ...prev, habits };
    });
  }

  function handleClearData() {
    clearData();
    const habits = createDemoHabits(year, month);
    const mentalState = createDemoMentalState(year, month);
    setData({ habits, mentalState });
  }

  async function handleImport(file) {
    try {
      const imported = await importDataFromFile(file);
      setData({
        habits: imported.habits,
        mentalState: imported.mentalState ?? createDemoMentalState(year, month),
      });
    } catch {
      window.alert('Could not import file — invalid format.');
    }
  }

  const stats = overallStats(data.habits, year, month);
  const dailySeries = dailyCompletionSeries(data.habits, year, month).map((d) => ({
    day: d.day,
    percent: d.percent,
  }));
  const weeklyStats = weeklyCompletionStats(data.habits, year, month);
  const ranking = habitRanking(data.habits, year, month);
  const { best, worst } = bestAndWorstHabit(data.habits, year, month);
  const dailyProgressItems = data.habits.map((h) => ({
    id: h.id,
    name: h.name,
    color: h.color,
    percent: habitCompletionPercent(h, year, month),
    completed: habitCompletionCount(h, year, month),
    total: allDays.length,
    streak: currentStreak(h, year, month),
  }));
  const mentalRanking = habitRanking(data.mentalState, year, month);
  const mentalSeries = useMemo(() => generateMentalStateSeries(year, month), [year, month]);

  return (
    <div className="min-h-screen bg-bg">
      <Navigation active={activeTab} onChange={setActiveTab} />

      {activeTab === 'settings' ? (
        <SettingsPage
          onClearData={handleClearData}
          onExport={() => exportData(data)}
          onImport={handleImport}
        />
      ) : activeTab === 'workout' ? (
        <WorkoutLog />
      ) : activeTab === 'food' ? (
        <FoodLog />
      ) : activeTab === 'skills' ? (
        <SkillsLog />
      ) : activeTab === 'analytics' ? (
        <Analytics />
      ) : (
        <div className="px-3 sm:px-6 pb-10">
          <Header year={year} month={month} onPrevMonth={goPrevMonth} onNextMonth={goNextMonth} stats={stats} />

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-4">
            <HabitGrid
              habits={data.habits}
              year={year}
              month={month}
              allDays={allDays}
              onToggle={toggleHabitDay}
              onAddHabit={() => {
                setModalHabit(null);
                setModalOpen(true);
              }}
              onEditHabit={(h) => {
                setModalHabit(h);
                setModalOpen(true);
              }}
              onDeleteHabit={handleDeleteHabit}
              onReorder={handleReorder}
            />
            <AnalysisPanel ranking={ranking} />
          </div>

          <div className="mt-4">
            <ProgressChart data={dailySeries} />
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-4">
            <div className="bg-panel border border-panel-border rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-text tracking-wide">Mental State</h2>
                <span className="text-[10px] uppercase tracking-wider text-text-dim">
                  Mood &middot; Energy &middot; Motivation
                </span>
              </div>
              <HabitGrid
                habits={data.mentalState}
                year={year}
                month={month}
                allDays={allDays}
                onToggle={toggleMentalDay}
                title=""
                showAddButton={false}
                allowEditDelete={false}
                allowReorder={false}
                footerLabel="Avg %"
              />
              <div className="mt-3">
                <MentalStateChart data={mentalSeries} />
              </div>
            </div>
            <AnalysisPanel ranking={mentalRanking} title="Analysis" />
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HabitualStats weeklyStats={weeklyStats} best={best} worst={worst} />
            <WeeklyProgress weeklyStats={weeklyStats} />
          </div>

          <div className="mt-4">
            <DailyProgress items={dailyProgressItems} />
          </div>
        </div>
      )}

      {modalOpen && (
        <AddHabitModal
          habit={modalHabit}
          onSave={handleSaveHabit}
          onClose={() => {
            setModalOpen(false);
            setModalHabit(null);
          }}
        />
      )}
    </div>
  );
}
