import type { AuthError } from '@supabase/supabase-js';

type AuthAction = 'login' | 'register' | 'reset' | 'google';

const messagesByCode: Record<string, string> = {
  email_not_confirmed: 'Подтвердите почту по ссылке из письма, а затем войдите.',
  email_address_invalid: 'Проверьте адрес электронной почты.',
  email_exists: 'Аккаунт с такой почтой уже существует. Перейдите во вкладку «Вход».',
  invalid_credentials: 'Неверная почта или пароль.',
  over_email_send_rate_limit: 'Слишком много писем за короткое время. Подождите минуту и попробуйте снова.',
  over_request_rate_limit: 'Слишком много попыток. Немного подождите и попробуйте снова.',
  signup_disabled: 'Регистрация сейчас отключена. Обратитесь к владельцу приложения.',
  user_already_exists: 'Аккаунт с такой почтой уже существует. Перейдите во вкладку «Вход».',
  weak_password: 'Пароль слишком простой. Добавьте буквы и цифры.',
};

export function getAuthErrorMessage(error: AuthError, action: AuthAction) {
  if (error.code && messagesByCode[error.code]) return messagesByCode[error.code];

  if (action === 'login') return 'Не получилось войти. Проверьте почту и пароль.';
  if (action === 'register') return 'Не получилось создать аккаунт. Попробуйте ещё раз.';
  if (action === 'reset') return 'Не удалось отправить письмо. Проверьте адрес и попробуйте снова.';
  return 'Не удалось войти через Google. Попробуйте ещё раз.';
}
