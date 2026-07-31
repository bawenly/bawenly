import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  removeAvatar,
  saveProfile,
  uploadAvatar,
} from '../lib/profile';
import { useProfile } from './ProfileProvider';
import { UserAvatar } from './UserAvatar';

type Props = { onCancel: () => void; onSaved: () => void };

export function ProfileEditor({ onCancel, onSaved }: Props) {
  const { user, profile, refreshProfile } = useProfile();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(profile?.avatarUrl ?? null);
  const [removeCurrent, setRemoveCurrent] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (!AVATAR_TYPES.includes(nextFile.type)) {
      setError('Выберите изображение JPG, PNG, WebP или GIF.');
      event.target.value = '';
      return;
    }
    if (nextFile.size > AVATAR_MAX_BYTES) {
      setError('Изображение должно быть не больше 5 МБ.');
      event.target.value = '';
      return;
    }
    setError('');
    setFile(nextFile);
    setRemoveCurrent(false);
    setPreview(URL.createObjectURL(nextFile));
  }

  function clearAvatar() {
    setFile(null);
    setPreview(null);
    setRemoveCurrent(Boolean(profile?.avatarPath));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Имя не может быть пустым.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      let avatarPath = removeCurrent ? null : profile?.avatarPath ?? null;
      if (file) avatarPath = await uploadAvatar(user.id, file);
      await saveProfile(user.id, cleanName, avatarPath);
      if ((removeCurrent || file) && profile?.avatarPath) await removeAvatar(profile.avatarPath);
      await refreshProfile();
      onSaved();
    } catch {
      setError('Не удалось сохранить профиль. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="profile-editor" onSubmit={submit} noValidate>
      <UserAvatar name={name.trim()} avatarUrl={preview} className="profile-card__avatar" />
      <div className="profile-editor__avatar-actions">
        <label className="profile-link profile-file">
          {preview ? 'Изменить' : 'Выбрать аватар'}
          <input type="file" accept={AVATAR_TYPES.join(',')} onChange={chooseFile} />
        </label>
        {preview && <button className="profile-link" type="button" onClick={clearAvatar}>Удалить</button>}
      </div>
      <p className="profile-editor__hint">JPG, PNG, WebP или GIF, до 5 МБ</p>
      <label className="field">
        <span>Имя пользователя</span>
        <input value={name} maxLength={80} autoComplete="name"
          onChange={(event) => { setName(event.target.value); setError(''); }} />
      </label>
      {error && <p className="profile-editor__error" role="alert">{error}</p>}
      <div className="profile-card__actions">
        <button className="profile-cancel" type="button" onClick={onCancel}>Отмена</button>
        <button type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
      </div>
    </form>
  );
}
