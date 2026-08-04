import { supabase } from './supabase';
import type { TaskStep } from './tasks';
import type { TimerSession } from './timer';
import { currentLanguage } from './locale';

const coachSystem = `Ты добрый помощник по продуктивности для подростка.
Пиши по-русски, коротко и конкретно. Не стыди и не ставь диагнозы.
Предлагай только безопасные, выполнимые действия. Не используй Markdown.`;

async function askAi(prompt: string, system = coachSystem) {
  const languageInstruction = currentLanguage() === 'en'
    ? 'Reply in natural, concise English. Keep a calm, supportive tone. All generated titles, steps and explanations must be in English.'
    : 'Отвечай на естественном русском языке. Сохраняй спокойный, поддерживающий тон.';
  const { data, error } = await supabase.functions.invoke('ai', { body: { prompt, system: `${system}\n${languageInstruction}` } });
  if (error) throw new Error('ИИ сейчас недоступен. Попробуй ещё раз чуть позже.');
  if (!data || typeof data.text !== 'string') throw new Error('ИИ не смог подготовить ответ.');
  return data.text.trim();
}

type SupportPhraseContext = {
  recentPhrases: string[];
};

export function createSupportPhrase({ recentPhrases }: SupportPhraseContext) {
  const recent = recentPhrases.length
    ? `Не повторяй эти недавние фразы: ${JSON.stringify(recentPhrases)}.`
    : '';

  return askAi(`Напиши одну обобщённую фразу для спокойного настроя на работу, поддержки и мягкого начала.
Фраза не должна быть связана с конкретной задачей, именем, причиной прокрастинации или прогрессом пользователя.
Используй тёплый, естественный и ненавязчивый тон. Не дави, не вызывай чувство вины и избегай токсичной продуктивности.
Не давай конкретных инструкций, не назначай время и не обещай результат.
Избегай чрезмерно восторженных, пафосных и детских формулировок.
Пиши простыми повседневными словами о спокойном отношении к началу работы. Не используй поэтические метафоры и олицетворения вроде «тепло обнимает», «покой обволакивает», а также возвышенные слова о духе, внутреннем свете или великом пути.
Верни ровно одно короткое естественное предложение, не более 110 символов, без кавычек, эмодзи и пояснений.
Примеры характера фраз, которые нельзя копировать дословно: «Можно начать спокойно — не обязательно делать всё сразу», «Небольшое движение вперёд уже имеет значение».
${recent}`);
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(cleaned) as T;
}

export async function clarifyTask(title: string) {
  return askAi(`Сделай задачу конкретной и проверяемой, сохранив смысл.
Исходная задача: "${title}". Ответь только новым названием, не длиннее 90 символов.`);
}

export type TaskScenario = { steps: TaskStep[]; finalState: string };

export async function createTaskScenario(title: string, reason?: string): Promise<TaskScenario> {
  const taskTitle = title.trim();
  if (!taskTitle) throw new Error('Напиши задачу — можно всего пару слов.');
  const reasonContext = reason?.trim()
    ? `Пользователю мешает начать: "${reason.trim()}". Используй это как контекст, но не повторяй причину механически в шагах.`
    : '';
  const createPlanResponse = () => askAi(`Составь практичный план выполнения только этой задачи: ${JSON.stringify(taskTitle)}.
${reasonContext}
Не заменяй задачу примером, похожей задачей или задачей про подготовку к тесту. Каждый шаг должен относиться именно к переданному тексту задачи.
Адаптируй подход к препятствию пользователя, но не называй и не повторяй его механически. При страхе ошибки начни с безопасного чернового результата; при непонимании сначала получи ясный критерий результата и конкретный список недостающих сведений; при перегруженности выдели один приоритетный посильный участок; при нехватке энергии предложи короткий, но содержательный старт без чрезмерного упрощения.
Учитывай препятствие при формулировке, последовательности, объёме и отдельной оценке времени каждого шага.
Количество шагов выбери по реальной сложности задачи: простая задача может состоять из 1–2 шагов, объёмная — из большего числа, но не более 8.
Строго соблюдай масштаб формулировки: «короткая» и «небольшой» обычно требуют 3–5 шагов и до 120 минут суммарно; «начать» — 2–5 шагов только до первого содержательного чернового результата, а не план полного завершения большой работы. Не добавляй работу сверх результата, который запросил пользователь.
Создавай логичные, конкретные и последовательные шаги среднего размера. Начни с лёгкого, но содержательного действия, которое действительно запускает работу.
Каждый шаг начинай с глагола действия и ясно указывай видимый или измеримый промежуточный результат.
Не создавай микрошаги вроде «открыть документ», «подумать о задаче» или «найти информацию» без уточнения ожидаемого результата.
Если соседние действия занимают по несколько минут и по отдельности не дают ценного результата, объедини их. Не назначай первому шагу стандартные две минуты.
Если шаг требует нескольких разных содержательных действий, имеет неясный результат или не помещается в комфортный рабочий отрезок, раздели его на последовательные шаги.
Выстрой шаги так, чтобы результат каждого естественно становился основой следующего.
Для каждого шага отдельно рассчитай реалистичное время по его содержанию и ожидаемому результату. Обычно один шаг должен занимать 5–45 минут; если содержательная работа требует больше 45 минут, раздели её на последовательные шаги. Не завышай простые действия, не занижай содержательную работу и не повторяй одну длительность механически.
Для каждого шага заранее подготовь дополнительную помощь. Выбери 2–3 действительно полезных варианта по содержанию шага и причине: конкретный материал или мини-пример, точный поисковый запрос с критериями источников, вопросы для размышления, упражнение или короткую практику поддержки. В поле result сразу дай готовую помощь, чтобы для её показа не требовался новый запрос.
Перед ответом молча проверь каждый шаг: (1) действие конкретно; (2) результат видим или измерим; (3) шаг не слишком мелкий; (4) в нём нет слишком многих разных действий; (5) время реалистично; (6) он продолжает предыдущий результат. Шаг, не прошедший проверку, переформулируй, раздели или объедини до возврата JSON.
Опиши finalState — короткое ясное состояние, которое увидит пользователь после последнего шага и по которому поймёт, что задача завершена.
Верни только JSON-объект: {"taskTitle":${JSON.stringify(taskTitle)},"steps":[{"title":"действие","minutes":10,"support":{"message":"короткое спокойное вступление","options":[{"id":"material","label":"короткая подпись","result":"готовая конкретная помощь"}]}}],"finalState":"конкретный итог выполненной задачи"}.
Поле taskTitle скопируй из запроса абсолютно точно, без исправлений и перефразирования.
minutes — реалистичное целое число от 1 до 180.`);

  let response = parseJson<{ taskTitle?: unknown; steps?: unknown; finalState?: unknown }>(await createPlanResponse());
  if (response.taskTitle !== taskTitle) {
    response = parseJson<{ taskTitle?: unknown; steps?: unknown; finalState?: unknown }>(await createPlanResponse());
  }
  if (response.taskTitle !== taskTitle) {
    throw new Error('ИИ составил план для другой задачи. Попробуй ещё раз.');
  }
  const plan = response.steps;
  if (!Array.isArray(plan)) throw new Error('Не получилось составить план.');
  const steps = plan.slice(0, 8).map((step) => {
    if (typeof step.title !== 'string' || !step.title.trim()
      || typeof step.minutes !== 'number' || !Number.isFinite(step.minutes)) {
      throw new Error('ИИ вернул неполный план. Попробуй составить его ещё раз.');
    }
    const support = step.support as { message?: unknown; options?: unknown } | undefined;
    if (!support || !Array.isArray(support.options) || support.options.length < 2) {
      throw new Error('ИИ вернул неполную помощь для шага. Попробуй составить план ещё раз.');
    }
    const options = support.options.slice(0, 3).map((option, index) => {
      const value = option as Record<string, unknown>;
      if (typeof value.label !== 'string' || typeof value.result !== 'string'
        || !value.label.trim() || !value.result.trim()) {
        throw new Error('ИИ вернул неполную помощь для шага. Попробуй составить план ещё раз.');
      }
      return { id: typeof value.id === 'string' ? value.id.slice(0, 40) : `option-${index}`,
        label: value.label.trim().slice(0, 60), result: value.result.trim().slice(0, 1000) };
    });
    return {
      id: crypto.randomUUID(),
      title: step.title.trim().slice(0, 120),
      minutes: Math.min(180, Math.max(1, Math.round(step.minutes))),
      done: false,
      support: { message: typeof support.message === 'string' ? support.message.trim().slice(0, 180) : '', options },
    };
  });
  if (!steps.length || typeof response.finalState !== 'string' || !response.finalState.trim()) {
    throw new Error('ИИ вернул неполный сценарий. Попробуй составить его ещё раз.');
  }
  return { steps, finalState: response.finalState.trim().slice(0, 500) };
}

export async function createTaskPlan(title: string, reason?: string): Promise<TaskStep[]> {
  return (await createTaskScenario(title, reason)).steps;
}

export async function estimateTaskMinutes(title: string) {
  const text = await askAi(`Оцени, сколько минут обычно нужно подростку на задачу "${title}".
Учти подготовку и проверку результата. Ответь только одним целым числом от 2 до 480.`);
  const minutes = Number.parseInt(text.match(/\d+/)?.[0] ?? '', 10);
  if (!Number.isFinite(minutes)) throw new Error('Не получилось оценить время.');
  return Math.min(480, Math.max(2, minutes));
}

type SuggestedStep = Pick<TaskStep, 'title' | 'minutes'>;

async function parseSuggestedStep(prompt: string): Promise<SuggestedStep> {
  const result = parseJson<{ title?: unknown; minutes?: unknown }>(await askAi(prompt));
  if (typeof result.title !== 'string' || !result.title.trim()
    || typeof result.minutes !== 'number' || !Number.isFinite(result.minutes)) {
    throw new Error('ИИ не смог подобрать шаг и время. Попробуй ещё раз.');
  }
  return {
    title: result.title.trim().slice(0, 120),
    minutes: Math.min(180, Math.max(1, Math.round(result.minutes))),
  };
}

export function createFirstStep(task: string, reason: string) {
  return parseSuggestedStep(`Задача: "${task}". Начать мешает: "${reason}".
Предложи первый осмысленный шаг, который легко начать и который даст заметный результат.
Не предлагай формальные действия вроде «открыть документ», «посмотреть на задачу» или «подготовиться», если у них нет самостоятельной ценности. Объедини слишком мелкие действия.
Отдельно рассчитай реалистичную длительность по содержанию, сложности и результату шага: короткому действию дай мало времени, содержательному — больше.
Верни только JSON: {"title":"конкретное действие и результат","minutes":5}. minutes — целое число от 1 до 180.`);
}

export function simplifyStep(task: string, currentStep: string, reason?: string) {
  const reasonContext = reason?.trim() ? `Начать мешает: "${reason.trim()}".` : '';
  return parseSuggestedStep(`Задача: "${task}". Текущий шаг: "${currentStep}". ${reasonContext}
Учти это препятствие в формулировке и оценке времени, не упоминая его механически.
Сделай шаг легче для начала, сохранив заметный самостоятельный результат. Не превращай его в формальность и объедини действия, которые по отдельности не имеют ценности.
Отдельно рассчитай реалистичную длительность нового шага, не назначай время по умолчанию.
Верни только JSON: {"title":"конкретное действие и результат","minutes":5}. minutes — целое число от 1 до 180.`);
}

export function createSessionAdvice(session: TimerSession) {
  const minutes = Math.max(1, Math.round(session.seconds / 60));
  return askAi(`Пользователь только что работал ${minutes} минут над задачей "${session.taskTitle}".
Дай один короткий совет: продолжить маленьким шагом, отдохнуть или завершить на сегодня.
Укажи конкретное следующее действие.`);
}

export function createWeeklyReview(sessions: TimerSession[]) {
  const summary = sessions.slice(0, 30).map((session) => ({
    task: session.taskTitle,
    minutes: Math.round(session.seconds / 60),
    completedAt: session.completedAt,
  }));
  return askAi(`Вот сессии фокуса пользователя за последние 7 дней:
${JSON.stringify(summary)}
Напиши 2 коротких предложения: доброжелательное наблюдение о ритме и одну небольшую цель на следующую неделю.`);
}
