import type { ClarificationQuestion } from '../lib/taskClarification';

type Props = {
  question: ClarificationQuestion;
  answer: string;
  language: 'ru' | 'en';
  onChange: (answer: string) => void;
};

export function ClarificationChoice({ question, answer, language, onChange }: Props) {
  const options = question.options ?? [];
  const hasCustomAnswer = Boolean(answer) && !options.includes(answer);

  return (
    <fieldset className="clarification-choice">
      <legend>
        {question.label}{question.required ? ' *' : ''}
        <small>{language === 'en' ? 'Choose one option' : 'Выберите один вариант'}</small>
      </legend>
      <div className="clarification-choice__options" role="radiogroup">
        {options.map((option) => {
          const selected = answer === option;
          return <button type="button" role="radio" aria-checked={selected} key={option}
            className={selected ? 'clarification-option clarification-option--selected' : 'clarification-option'}
            onClick={() => onChange(option)}>
            <span className="clarification-option__mark" aria-hidden="true">{selected ? '✓' : ''}</span>
            <span>{option}</span>
          </button>;
        })}
      </div>
      <label className={hasCustomAnswer ? 'clarification-custom clarification-custom--selected' : 'clarification-custom'}>
        <span>{language === 'en' ? 'Your own answer' : 'Свой ответ'}</span>
        <input type="text" value={hasCustomAnswer ? answer : ''}
          placeholder={language === 'en' ? 'Type another answer' : 'Напишите другой ответ'}
          onChange={(event) => onChange(event.target.value)} />
      </label>
    </fieldset>
  );
}
