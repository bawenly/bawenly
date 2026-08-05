export type ClarificationQuestion = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'choice';
  required: boolean;
  placeholder?: string;
  options?: string[];
};

export type ClarificationAnswer = { question: string; answer: string };

type StoredClarification = {
  reason: string;
  questions: ClarificationQuestion[];
  answers: Record<string, string>;
};

const STORAGE_PREFIX = 'baw-task-clarification-v1:';

export function loadClarification(taskId: string): StoredClarification | null {
  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}${taskId}`);
    return value ? JSON.parse(value) as StoredClarification : null;
  } catch {
    return null;
  }
}

export function saveClarification(taskId: string, value: StoredClarification) {
  window.localStorage.setItem(`${STORAGE_PREFIX}${taskId}`, JSON.stringify(value));
}

export function clearClarification(taskId: string) {
  window.localStorage.removeItem(`${STORAGE_PREFIX}${taskId}`);
}

export function answeredClarifications(
  questions: ClarificationQuestion[], answers: Record<string, string>,
): ClarificationAnswer[] {
  return questions.flatMap((question) => {
    const answer = answers[question.id]?.trim();
    return answer ? [{ question: question.label, answer }] : [];
  });
}
