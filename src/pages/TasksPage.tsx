import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardHeader } from '../components/DashboardHeader';
import { TaskCard } from '../components/TaskCard';
import { TaskComposer } from '../components/TaskComposer';
import { getLocalDateKey, loadStoredTasks, TASKS_STORAGE_KEY, type Task, type TaskFilter } from '../lib/tasks';
import { useAuthModal } from '../components/AuthModal';
import { loadUserTasks, persistTask, removeTask } from '../lib/taskRepository';
import { ACTIVE_TASK_FLOW_KEY, ACTIVE_TASK_ORIGIN_KEY, PENDING_TASK_KEY } from '../lib/taskFlowStorage';

const filters: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'В работе' },
  { value: 'today', label: 'На сегодня' },
  { value: 'done', label: 'Завершённые' },
];

export function TasksPage() {
  const { openAuth } = useAuthModal();
  const [, setLocation] = useLocation();
  const [tasks, setTasks] = useState<Task[]>(loadStoredTasks);
  const [today, setToday] = useState(getLocalDateKey);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [query, setQuery] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const refreshTasks = () => setTasks(loadStoredTasks());
    window.addEventListener('baw-tasks-changed', refreshTasks);
    return () => window.removeEventListener('baw-tasks-changed', refreshTasks);
  }, []);

  useEffect(() => {
    void loadUserTasks().then(setTasks).catch(() => {
      // Локальный кэш уже показан; синхронизацию можно повторить при следующем открытии.
    });
  }, []);

  useEffect(() => {
    const refreshDate = window.setInterval(() => setToday(getLocalDateKey()), 60_000);
    return () => window.clearInterval(refreshDate);
  }, []);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === 'all'
      || (filter === 'active' && ['in_progress', 'paused'].includes(task.status))
      || (filter === 'today' && task.dueDate === today)
      || (filter === 'done' && task.status === 'done');
    return matchesSearch && matchesFilter;
  }), [filter, query, tasks, today]);

  function continueTask(task: Task) {
    window.localStorage.removeItem(PENDING_TASK_KEY);
    window.localStorage.setItem(ACTIVE_TASK_FLOW_KEY, task.id);
    window.localStorage.setItem(ACTIVE_TASK_ORIGIN_KEY, 'tasks');
    setLocation(`/tasks/${task.id}`);
  }

  function requestContinue(task: Task) {
    window.localStorage.setItem(PENDING_TASK_KEY, task.id);
    openAuth(() => continueTask(task));
  }

  function updateTask(nextTask: Task) {
    setTasks((current) => current.map((task) => task.id === nextTask.id ? nextTask : task));
    void persistTask(nextTask);
  }

  return (
    <div className="dashboard-page">
      <DashboardHeader />
      <main className="tasks-shell">
        <section className="tasks-toolbar" aria-labelledby="tasks-title">
          <div className="tasks-toolbar__top">
            <h1 className="cormorant-heading cormorant-heading--prominent" id="tasks-title">Мои задачи</h1>
          </div>
          <div className="tasks-toolbar__controls">
            <label className="task-search">
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">Поиск задач</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти задачу" />
            </label>
            <div className="task-filters" role="group" aria-label="Фильтры задач">
              {filters.map((item) => (
                <button className={filter === item.value ? 'task-filter task-filter--active' : 'task-filter'} type="button" key={item.value} onClick={() => setFilter(item.value)}>
                  {item.label}
                </button>
              ))}
            </div>
            <button className="new-task-button" type="button" onClick={() => openAuth(() => setIsComposerOpen(true))}>
              <span aria-hidden="true">＋</span> Новая задача
            </button>
          </div>
        </section>

        {isComposerOpen && <TaskComposer onClose={() => setIsComposerOpen(false)} onAdd={(task) => {
          setTasks((current) => [task, ...current]);
          void persistTask(task);
        }} />}

        <section className="tasks-list" aria-label="Список задач">
          {visibleTasks.map((task) => (
            <TaskCard task={task} key={task.id} onChange={updateTask}
              onContinue={() => requestContinue(task)}
              onDelete={() => {
                setTasks((current) => current.filter((item) => item.id !== task.id));
                void removeTask(task.id);
              }} />
          ))}
          {visibleTasks.length === 0 && <div className="tasks-empty">Здесь пока тихо. Можно выбрать другой фильтр или добавить задачу.</div>}
        </section>
      </main>
    </div>
  );
}
