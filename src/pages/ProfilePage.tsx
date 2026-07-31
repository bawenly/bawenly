import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Brand } from '../components/Brand';
import { ProfileEditor } from '../components/ProfileEditor';
import { useProfile } from '../components/ProfileProvider';
import { UserAvatar } from '../components/UserAvatar';
import { supabase } from '../lib/supabase';

export function ProfilePage() {
  const [, navigate] = useLocation();
  const { user, profile, loading } = useProfile();
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [loading, navigate, user]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  if (loading || !user) {
    return <main className="profile-page"><p>Загружаем профиль…</p></main>;
  }

  const name = profile?.displayName ?? '';
  return (
    <main className="profile-page">
      <div className="shell profile-page__shell">
        <Brand />
        <section className={`profile-card${editing ? ' profile-card--editing' : ''}`}>
          {editing ? (
            <>
              <p className="eyebrow">Редактирование профиля</p>
              <h1>Ваш профиль</h1>
              <ProfileEditor onCancel={() => navigate('/')} onSaved={() => setEditing(false)} />
            </>
          ) : (
            <>
              <UserAvatar name={name} avatarUrl={profile?.avatarUrl ?? null} className="profile-card__avatar" />
              <p className="eyebrow">Ваш профиль</p>
              <h1>{name || 'Пользователь'}</h1>
              <p>{user.email}</p>
              <div className="profile-card__actions">
                <Link className="profile-link" href="/">На главную</Link>
                <button type="button" onClick={() => setEditing(true)}>Редактировать</button>
                <button className="profile-signout" type="button" onClick={handleSignOut}>Выйти</button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
