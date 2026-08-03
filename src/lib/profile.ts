import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Language } from './locale';

export type Profile = {
  userId: string;
  displayName: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  visitStreak: number;
  language: Language;
};

type ProfileRow = {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  visit_streak: number;
  language: Language;
};

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function getAccountName(user: User) {
  const metadataName = user.user_metadata.full_name ?? user.user_metadata.name;
  return typeof metadataName === 'string' ? metadataName.trim() : '';
}

async function getAvatarUrl(path: string | null) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function loadProfile(user: User): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_path, visit_streak, language')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRow>();
  if (error) throw error;

  const displayName = data?.display_name ?? getAccountName(user);
  return {
    userId: user.id,
    displayName,
    avatarPath: data?.avatar_path ?? null,
    avatarUrl: await getAvatarUrl(data?.avatar_path ?? null),
    visitStreak: data?.visit_streak ?? 0,
    language: data?.language ?? 'ru',
  };
}

export async function saveProfileLanguage(userId: string, language: Language) {
  const { error } = await supabase.from('profiles').update({ language, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) throw error;
}

export async function saveProfile(userId: string, displayName: string, avatarPath: string | null) {
  const cleanName = displayName.trim();
  if (!cleanName) throw new Error('Введите имя.');
  const { error } = await supabase.from('profiles').upsert({
    user_id: userId,
    display_name: cleanName,
    avatar_path: avatarPath,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function uploadAvatar(userId: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file);
  if (error) throw error;
  return path;
}

export async function removeAvatar(path: string | null) {
  if (!path) return;
  const { error } = await supabase.storage.from('avatars').remove([path]);
  if (error) throw error;
}

export function personalizeAiSystem(system: string, displayName: string) {
  const cleanName = displayName.trim();
  return cleanName ? `${system}\nОбращайся к пользователю по имени: ${cleanName}.` : system;
}
