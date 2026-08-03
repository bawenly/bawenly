const WELCOME_COMPLETED_KEY = 'baw-welcome-completed';

export function hasCompletedWelcome() {
  return window.localStorage.getItem(WELCOME_COMPLETED_KEY) === 'true';
}

export function completeWelcome() {
  window.localStorage.setItem(WELCOME_COMPLETED_KEY, 'true');
}
