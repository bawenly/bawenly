import { FormEvent, useId, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthMode = 'register' | 'login';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  onSuccess?: () => void;
};

export function AuthForm({ onSuccess }: Props) {
  const emailId = useId();
  const passwordId = useId();
  const [mode, setMode] = useState<AuthMode>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState('');
  const emailError = submitted && !emailPattern.test(email)
    ? 'Проверьте адрес — например, name@example.com.' : '';
  const passwordError = submitted && password.length < 8
    ? 'Добавьте ещё символы: пароль должен содержать минимум 8.' : '';

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSubmitted(false);
    setNotice('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setNotice('');
    if (!emailPattern.test(email) || password.length < 8) return;
    if (!isSupabaseConfigured) {
      setNotice('Сервис временно недоступен. Попробуйте немного позже.');
      return;
    }
    setBusy(true);
    try {
      const result = mode === 'register'
        ? await supabase.auth.signUp({
            email, password, options: { emailRedirectTo: window.location.origin },
          })
        : await supabase.auth.signInWithPassword({ email, password });
      setNotice(result.error
        ? 'Не получилось продолжить. Проверьте данные и попробуйте ещё раз.'
        : mode === 'register'
          ? 'Готово! Проверьте почту, чтобы подтвердить аккаунт.'
          : 'Вы вошли. Добро пожаловать обратно!');
      if (!result.error && result.data.session) onSuccess?.();
    } catch {
      setNotice('Нет связи с сервисом. Проверьте интернет и попробуйте снова.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured) {
      setNotice('Сервис временно недоступен. Попробуйте немного позже.');
      return;
    }
    setBusy(true);
    setNotice('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/profile` },
    });
    if (error) {
      setNotice('Не удалось войти через Google. Попробуйте ещё раз.');
      setBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    setSubmitted(false);
    if (!emailPattern.test(email)) {
      setNotice('Сначала введите электронную почту, привязанную к аккаунту.');
      return;
    }
    if (!isSupabaseConfigured) {
      setNotice('Сервис временно недоступен. Попробуйте немного позже.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    setNotice(error
      ? 'Не удалось отправить письмо. Проверьте адрес и попробуйте снова.'
      : 'Ссылка для восстановления отправлена на вашу почту.');
  };

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <header className="auth-card__header">
        <h2 id="auth-title">{mode === 'register' ? 'Создайте аккаунт' : 'С возвращением'}</h2>
        <p>Сохраните свой прогресс и продолжайте с любого устройства.</p>
      </header>
      <div className="auth-tabs" role="group" aria-label="Способ авторизации">
        <button type="button" aria-pressed={mode === 'register'}
          onClick={() => changeMode('register')}>Регистрация</button>
        <button type="button" aria-pressed={mode === 'login'}
          onClick={() => changeMode('login')}>Вход</button>
      </div>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor={emailId}>Электронная почта</label>
          <input id={emailId} type="email" autoComplete="email" placeholder="name@example.com"
            value={email} aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? `${emailId}-error` : undefined}
            onChange={(event) => setEmail(event.target.value)} />
          {emailError && <p id={`${emailId}-error`} className="field__error"><span>!</span>{emailError}</p>}
        </div>
        <div className="field">
          <div className="field__label-row">
            <label htmlFor={passwordId}>Пароль</label>
            {mode === 'login' && <button className="text-button" type="button"
              onClick={handlePasswordReset} disabled={busy}>Забыли пароль?</button>}
          </div>
          <div className="password-input">
            <input id={passwordId} type={showPassword ? 'text' : 'password'} minLength={8}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder="Минимум 8 символов" value={password}
              aria-invalid={Boolean(passwordError)}
              aria-describedby={`${passwordId}-hint${passwordError ? ` ${passwordId}-error` : ''}`}
              onChange={(event) => setPassword(event.target.value)} />
            <button type="button" onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>
              {showPassword ? 'Скрыть' : 'Показать'}
            </button>
          </div>
          <p id={`${passwordId}-hint`} className="field__hint">Не менее 8 символов</p>
          {passwordError && <p id={`${passwordId}-error`} className="field__error"><span>!</span>{passwordError}</p>}
        </div>
        <button className="submit-button" type="submit" disabled={busy}>
          {busy && <span className="spinner" aria-hidden="true" />}
          {busy ? 'Пожалуйста, подождите…' : mode === 'register' ? 'Создать аккаунт' : 'Войти'}
        </button>
        <div className="auth-divider"><span>или</span></div>
        <button className="google-button" type="button" onClick={handleGoogleSignIn} disabled={busy}>
          <span className="google-button__mark" aria-hidden="true">G</span>
          Войти через Google
        </button>
        {notice && <p className="form-notice" role="status">{notice}</p>}
      </form>
      <p className="legal">Регистрируясь, вы принимаете <a href="/terms">Условия использования</a> и <a href="/privacy">Политику конфиденциальности</a>.</p>
    </section>
  );
}
