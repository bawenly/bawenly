import { supabase } from './supabase';

export type SupportMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type SupportContext = {
  task: string;
  reason: string;
  messages: SupportMessage[];
  userMessage: string;
};

const supportSystem = `Ты спокойный и доброжелательный ИИ-напарник для подростка.
Твоя задача — морально поддержать человека, который откладывает дело, и помочь ему почувствовать, что он не один.
Сначала отнесись к переживаниям с пониманием. Не стыди, не дави, не ставь диагнозы и не используй токсичную мотивацию.
Не составляй полный план задачи: для этого в приложении есть отдельная функция. Если уместно, предложи только одно небольшое конкретное действие.
Не повторяй название препятствия механически. Пиши естественно, по-русски, не более 4 коротких предложений и без Markdown.
Если пользователь говорит о непосредственной опасности для себя или другого человека, мягко предложи немедленно обратиться к находящемуся рядом доверенному взрослому или экстренной помощи. Не изображай психолога или врача.`;

export async function askSupportAgent({
  task, reason, messages, userMessage,
}: SupportContext) {
  const history = messages.slice(-8).map(({ role, text }) => ({
    role,
    text: text.slice(0, 500),
  }));
  const prompt = `Контекст:
Текущая задача: ${task.trim() || 'пока не указана'}
Что мешает начать: ${reason.trim() || 'пока не указано'}
Недавний диалог: ${JSON.stringify(history)}

Новое сообщение пользователя: "${userMessage.trim()}"
Ответь как внимательный ИИ-напарник.`;

  const { data, error } = await supabase.functions.invoke('ai', {
    body: { prompt, system: supportSystem },
  });
  if (error) throw new Error('Напарник сейчас не отвечает. Попробуй ещё раз чуть позже.');
  if (!data || typeof data.text !== 'string') {
    throw new Error('Не получилось подготовить ответ. Попробуй написать ещё раз.');
  }
  return data.text.trim();
}
