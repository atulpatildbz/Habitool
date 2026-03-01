import { useHabits, Habit } from '../hooks/useHabits';
import { ContributionGraph } from './ContributionGraph';
import { CalendarView } from './CalendarView';
import { Plus, Trash2, Check, Flame, Settings2, Pencil, icons } from 'lucide-react';
import { useState, FormEvent, useMemo, useEffect, useDeferredValue, UIEvent } from 'react';
import { cn } from '../lib/utils';
import { calculateStreaks } from '../lib/streaks';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from './ui/dialog';

const COLORS = [
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
];

const VALID_ICONS = Object.keys(icons).filter(name => {
  if (name === 'createLucideIcon' || name === 'default' || name === 'icons' || name === 'LucideProps') return false;
  if (name.endsWith('Icon') || name.startsWith('Lucide')) return false;
  return true;
});

export function HabitList() {
  const { habits, logs, addHabit, deleteHabit, updateHabit, toggleHabitDate, updateHabitDate } = useHabits();
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState('Activity');
  const [iconSearch, setIconSearch] = useState('');
  const deferredIconSearch = useDeferredValue(iconSearch);
  const [iconTags, setIconTags] = useState<Record<string, string[]>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [target, setTarget] = useState(1);
  const [streakGoal, setStreakGoal] = useState<number | ''>('');
  const [visibleIconCount, setVisibleIconCount] = useState(100);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://unpkg.com/lucide-static@latest/tags.json')
      .then(res => res.json())
      .then(data => setIconTags(data))
      .catch(err => console.error('Failed to load icon tags', err));
  }, []);

  useEffect(() => {
    setVisibleIconCount(100);
  }, [deferredIconSearch]);

  const filteredIcons = useMemo(() => {
    const searchLower = deferredIconSearch.toLowerCase();
    
    const matchingPascalNames = new Set<string>();
    if (searchLower) {
      for (const [kebabName, tags] of Object.entries(iconTags)) {
        const tagArray = tags as string[];
        if (kebabName.includes(searchLower) || tagArray.some(tag => tag.toLowerCase().includes(searchLower))) {
          const pascalName = kebabName.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
          matchingPascalNames.add(pascalName);
        }
      }
    }

    return VALID_ICONS.filter(name => {
      if (!searchLower) return true;
      if (name.toLowerCase().includes(searchLower)) return true;
      if (matchingPascalNames.has(name)) return true;
      return false;
    });
  }, [deferredIconSearch, iconTags]);

  const handleIconScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      setVisibleIconCount(prev => Math.min(prev + 100, filteredIcons.length));
    }
  };

  const openAddModal = () => {
    setNewHabitName('');
    setSelectedColor(COLORS[0]);
    setSelectedIcon('Activity');
    setIconSearch('');
    setTarget(1);
    setStreakGoal('');
    setShowAdvanced(false);
    setModalMode('add');
    setEditingHabitId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (habit: Habit) => {
    setNewHabitName(habit.name);
    setSelectedColor(habit.color);
    setSelectedIcon(habit.icon || 'Activity');
    setIconSearch('');
    setTarget(habit.target || 1);
    setStreakGoal(habit.streakGoal || '');
    setShowAdvanced(!!habit.streakGoal || (habit.target && habit.target > 1));
    setModalMode('edit');
    setEditingHabitId(habit.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    
    if (modalMode === 'add') {
      addHabit(
        newHabitName.trim(), 
        selectedColor, 
        selectedIcon,
        target > 0 ? target : 1, 
        streakGoal ? Number(streakGoal) : undefined
      );
    } else if (modalMode === 'edit' && editingHabitId) {
      updateHabit(editingHabitId, {
        name: newHabitName.trim(),
        color: selectedColor,
        icon: selectedIcon,
        target: target > 0 ? target : 1,
        streakGoal: streakGoal ? Number(streakGoal) : undefined
      });
    }
    
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
      <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Habit Tracker
        </h1>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <button onClick={openAddModal} className="p-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 transition-transform hover:scale-105 active:scale-95">
              <Plus size={20} />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] p-6 rounded-2xl">
            <DialogTitle className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
              {modalMode === 'add' ? 'Add New Habit' : 'Edit Habit'}
            </DialogTitle>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
              <input
                type="text"
                placeholder="Name your habit..."
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="px-4 py-3 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
                autoFocus
              />
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Color</span>
                  <div className="flex items-center gap-2">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          "w-6 h-6 rounded-full transition-transform",
                          selectedColor === color ? "scale-110 ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100 dark:ring-offset-zinc-950" : "scale-100"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Icon</span>
                    <input
                      type="text"
                      placeholder="Search icons..."
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      className="px-3 py-1.5 text-sm w-32 sm:w-40 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    />
                  </div>
                  <div 
                    className="grid grid-cols-7 gap-1.5 max-h-[168px] overflow-y-auto p-1 scrollbar-hide"
                    onScroll={handleIconScroll}
                  >
                    {filteredIcons.slice(0, visibleIconCount).map(iconName => {
                      const Icon = icons[iconName as keyof typeof icons];
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setSelectedIcon(iconName)}
                          className={cn(
                            "p-2 rounded-xl transition-colors flex items-center justify-center",
                            selectedIcon === iconName 
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" 
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                          )}
                          title={iconName}
                        >
                          <Icon size={18} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      showAdvanced ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <Settings2 size={16} />
                    Advanced
                  </button>
                </div>
              </div>
              
              {showAdvanced && (
                <div className="flex flex-col gap-4 p-4 mt-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">Daily Target</span>
                    <input 
                      type="number" 
                      min="1" 
                      value={target} 
                      onChange={(e) => setTarget(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">Streak Goal</span>
                    <input 
                      type="number" 
                      min="1" 
                      placeholder="Optional"
                      value={streakGoal} 
                      onChange={(e) => setStreakGoal(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    />
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={!newHabitName.trim()}
                className="w-full mt-4 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium disabled:opacity-50 transition-opacity hover:bg-zinc-800 dark:hover:bg-zinc-200"
              >
                {modalMode === 'add' ? 'Create Habit' : 'Save Changes'}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-col gap-8">
        {habits.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            No habits yet. Add one above to get started!
          </div>
        ) : (
          habits.map(habit => {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const todayVal = logs[habit.id]?.[todayStr] || 0;
            const habitTarget = habit.target || 1;
            const isCompletedToday = todayVal >= habitTarget;
            const streaks = calculateStreaks(logs[habit.id] || {}, habitTarget);

            const IconComponent = icons[habit.icon as keyof typeof icons] || icons.Activity;
            
            // Function to convert hex to rgba for the icon background
            const hexToRgba = (hex: string, alpha: number) => {
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };

            return (
              <Dialog key={habit.id}>
                <DialogTrigger asChild>
                  <div 
                    className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm overflow-hidden cursor-pointer transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
                  >
                    <div className="flex flex-row items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4 min-w-0">
                        <div 
                          className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center" 
                          style={{ 
                            backgroundColor: hexToRgba(habit.color, 0.15),
                            color: habit.color 
                          }}
                        >
                          <IconComponent size={24} />
                        </div>
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {habit.name}
                        </h2>
                        <div className="flex items-center gap-1.5 ml-1 text-sm text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md shrink-0">
                          <Flame size={14} className={streaks.current > 0 ? "text-orange-500" : "text-zinc-400"} />
                          <span className={streaks.current > 0 ? "text-orange-600 dark:text-orange-400 font-medium" : ""}>
                            {streaks.current} {habit.streakGoal ? `/ ${habit.streakGoal}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                        {habitTarget > 1 ? (
                          <div className="flex items-center gap-2 mr-2 sm:mr-4">
                            <input 
                              type="number" 
                              min="0"
                              value={todayVal}
                              onChange={(e) => updateHabitDate(habit.id, new Date(), Number(e.target.value))}
                              onClick={(e) => e.stopPropagation()}
                              className="w-16 px-2 py-1.5 text-sm border rounded-md dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                            />
                            <span className="text-sm text-zinc-500 whitespace-nowrap">/ {habitTarget}</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleHabitDate(habit.id, new Date(), habitTarget); }}
                            className={cn(
                              "flex items-center justify-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-lg text-sm font-medium transition-colors",
                              isCompletedToday 
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" 
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                            )}
                          >
                            <Check size={18} className={cn(isCompletedToday ? "opacity-100" : "opacity-50")} />
                            <span className="hidden sm:inline">{isCompletedToday ? 'Completed' : 'Mark Today'}</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); openEditModal(habit); }}
                          className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors shrink-0"
                          title="Edit habit"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteHabit(habit.id); }}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0"
                          title="Delete habit"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                      <ContributionGraph
                        habit={habit}
                        logs={logs[habit.id] || {}}
                        onToggleDate={(date) => toggleHabitDate(habit.id, date, habitTarget)}
                      />
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-sm p-6 rounded-2xl">
                  <DialogTitle className="sr-only">Track {habit.name}</DialogTitle>
                  <CalendarView
                    habit={habit}
                    logs={logs[habit.id] || {}}
                    onToggleDate={(date) => toggleHabitDate(habit.id, date, habitTarget)}
                    onUpdateDate={(date, value) => updateHabitDate(habit.id, date, value)}
                  />
                </DialogContent>
              </Dialog>
            );
          })
        )}
      </div>
    </div>
  );
}
