export type TaskStatus = 'not_started' | 'in_progress' | 'paused' | 'done';
export type ActiveTaskStatus = Exclude<TaskStatus, 'paused'>;
export type TaskFilter = 'all' | 'active' | 'today' | 'done';

export type TaskStep = {
  id: string;
  title: string;
  done: boolean;
  minutes: number;
  actualSeconds?: number;
  substeps?: TaskStep[];
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  estimatedMinutes?: number;
  statusBeforePause?: ActiveTaskStatus;
  dueDate?: string;
  procrastinationReason?: string;
  steps?: TaskStep[];
  history?: TaskHistoryEntry[];
};

export type TaskHistoryEntry = {
  id: string;
  type: 'steps_collapsed';
  createdAt: string;
  completedSteps: TaskStep[];
  totalSteps: number;
};

export const TASKS_STORAGE_KEY = 'baw-tasks-v1';

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDeadline(dateKey: string) {
  const language = currentLanguage();
  if (dateKey === getLocalDateKey()) return language === 'en' ? 'Today' : 'Сегодня';
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, day));
}

export const statusLabels: Record<TaskStatus, string> = {
  not_started: 'Не начато',
  in_progress: 'В работе',
  paused: 'На паузе',
  done: 'Завершено',
};

export const initialTasks: Task[] = [
  {
    id: 'presentation',
    title: 'Подготовить презентацию для защиты проекта',
    status: 'in_progress',
    dueDate: getLocalDateKey(),
    steps: [
      { id: 'p1', title: 'Собрать идеи и примеры', done: true, minutes: 10 },
      { id: 'p2', title: 'Составить план презентации', done: true, minutes: 15 },
      { id: 'p3', title: 'Написать заголовки слайдов', done: true, minutes: 10 },
      { id: 'p4', title: 'Добавить основное содержание', done: false, minutes: 25 },
      { id: 'p5', title: 'Подобрать иллюстрации', done: false, minutes: 20 },
      { id: 'p6', title: 'Проверить и отрепетировать', done: false, minutes: 15 },
    ],
  },
  { id: 'message', title: 'Ответить Дане по проекту', status: 'not_started', dueDate: getLocalDateKey() },
  {
    id: 'portfolio',
    title: 'Обновить портфолио',
    status: 'paused',
    dueDate: `${new Date().getFullYear()}-08-02`,
    steps: [
      { id: 'f1', title: 'Выбрать три лучшие работы', done: true, minutes: 15 },
      { id: 'f2', title: 'Сделать скриншоты', done: false, minutes: 20 },
      { id: 'f3', title: 'Коротко описать каждую работу', done: false, minutes: 25 },
    ],
  },
  { id: 'desk', title: 'Разобрать стол', status: 'done' },
];

export function loadStoredTasks() {
  try {
    const saved = window.localStorage.getItem(TASKS_STORAGE_KEY);
    return saved ? JSON.parse(saved) as Task[] : initialTasks;
  } catch {
    return initialTasks;
  }
}

export function saveStoredTask(nextTask: Task) {
  const tasks = loadStoredTasks();
  const index = tasks.findIndex((task) => task.id === nextTask.id);
  const next = index === -1
    ? [nextTask, ...tasks]
    : tasks.map((task) => task.id === nextTask.id ? nextTask : task);
  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('baw-tasks-changed'));
  return nextTask;
}

export function withRecalculatedStatus(task: Task): Task {
  if (!task.steps?.length) return task;
  if (task.status === 'paused') return task;
  const allDone = task.steps.every((step) => step.done);
  if (allDone) return { ...task, status: 'done' };
  if (task.status === 'done') return { ...task, status: 'in_progress' };
  return task;
}
import { currentLanguage } from './locale';
