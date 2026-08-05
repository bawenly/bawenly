import { currentLanguage, type Language } from './locale';
import { supabase } from './supabase';

export type StepSupportOption = { id: string; label: string; intent: string };
export type StepSupportSuggestion = { message: string; options: StepSupportOption[] };

type StepSupportContext = {
  task: string;
  reason: string;
  step: string;
  completedSteps: string[];
};

async function askSupportAi(prompt: string, language: Language) {
  const languageRule = language === 'en'
    ? 'Write all user-facing text in natural, concise English.'
    : 'Пиши весь текст для пользователя на естественном, кратком русском языке.';
  const system = `Ты спокойный помощник подростка, который выполняет задачу по шагам.
${languageRule} Не стыди, не ставь диагнозы и не используй Markdown.`;
  const { data, error } = await supabase.functions.invoke('ai', { body: { prompt, system } });
  if (error || !data || typeof data.text !== 'string') {
    throw new Error(language === 'en' ? 'Help is temporarily unavailable.' : 'Помощь временно недоступна.');
  }
  return data.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
}

export async function createStepSupport(context: StepSupportContext): Promise<StepSupportSuggestion> {
  const language = currentLanguage();
  const text = await askSupportAi(`Task: ${JSON.stringify(context.task)}
Reason for procrastination: ${JSON.stringify(context.reason)}
Current step: ${JSON.stringify(context.step)}
Previously completed steps: ${JSON.stringify(context.completedSteps)}
Offer 2–3 distinct, optional kinds of extra help that complement the current step without repeating or replacing it.
For an abstract step, offer useful specificity: a search query, needed sources and reliability criteria, reflection questions, or a draft/example. For anxiety, fear of mistakes, or uncertainty, one option may be a brief calming or low-pressure starting practice. For overload, help choose one priority or a minimum sufficient result. If clarity is missing, offer one short clarifying question or a few concrete directions.
Labels must be specific and short (up to 45 characters). The intent privately tells the model what to produce after selection. Do not put the actual material in the label. Avoid obvious or generic advice. If extra help would add no value, return no options and one short supportive message.
Return only JSON: {"message":"short calm intro or supportive phrase","options":[{"id":"stable-short-id","label":"button label","intent":"specific help to produce"}]}.`, language);
  let parsed: { message?: unknown; options?: unknown };
  try { parsed = JSON.parse(text) as { message?: unknown; options?: unknown }; }
  catch { throw new Error(language === 'en' ? 'Could not prepare help. Try again.' : 'Не получилось подготовить помощь. Попробуй ещё раз.'); }
  const options = Array.isArray(parsed.options) ? parsed.options.slice(0, 3).flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const value = item as Record<string, unknown>;
    if (typeof value.label !== 'string' || typeof value.intent !== 'string') return [];
    const baseId = typeof value.id === 'string' ? value.id.slice(0, 36) : 'option';
    return [{ id: `${baseId}-${index}`,
      label: value.label.trim().slice(0, 60), intent: value.intent.trim().slice(0, 240) }];
  }) : [];
  return { message: typeof parsed.message === 'string' ? parsed.message.trim().slice(0, 180) : '', options };
}

export async function resolveStepSupport(context: StepSupportContext, option: StepSupportOption) {
  const language = currentLanguage();
  return askSupportAi(`Task: ${JSON.stringify(context.task)}
Reason for procrastination: ${JSON.stringify(context.reason)}
Current step: ${JSON.stringify(context.step)}
Previously completed steps: ${JSON.stringify(context.completedSteps)}
The user chose: ${JSON.stringify(option.label)}. Produce this help: ${JSON.stringify(option.intent)}.
Give a concrete, immediately usable result that complements rather than repeats the step. Keep it calm and compact: at most 5 short bullets or 90 words. If a missing personal detail is essential, ask exactly one short question instead. Do not claim the step is complete.`, language);
}
