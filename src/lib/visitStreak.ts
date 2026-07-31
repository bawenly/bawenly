import type { User } from '@supabase/supabase-js';
import { getAccountName } from './profile';
import { supabase } from './supabase';

type VisitStreakRow = {
  visit_streak: number;
};

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function recordVisit(user: User) {
  const { data, error } = await supabase.rpc('record_profile_visit', {
    p_local_date: getLocalDate(),
    p_display_name: getAccountName(user),
  });
  if (error) throw error;

  const row = (data as VisitStreakRow[] | null)?.[0];
  return row?.visit_streak ?? 1;
}

export function formatVisitStreak(days: number) {
  const lastTwoDigits = days % 100;
  const lastDigit = days % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${days} дней`;
  if (lastDigit === 1) return `${days} день`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${days} дня`;
  return `${days} дней`;
}
