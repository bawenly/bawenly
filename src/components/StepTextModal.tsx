import { FormEvent, useState } from 'react';
import { AppModal, type RequestModalClose } from './AppModal';

type Props = { mode: 'edit' | 'add'; initialValue?: string; onCancel: () => void; onSubmit: (value: string) => void };

export function StepTextModal({ mode, initialValue = '', onCancel, onSubmit }: Props) {
  const [value, setValue] = useState(initialValue);
  const isEdit = mode === 'edit';
  function submit(event: FormEvent, requestClose: RequestModalClose) {
    event.preventDefault();
    const title = value.trim();
    if (title) requestClose(() => onSubmit(title));
  }
  return (
    <AppModal title={isEdit ? 'Редактировать шаг' : 'Добавить подпункт'} onClose={onCancel} actions={(requestClose) => <>
      <button type="button" onClick={() => requestClose()}>Отмена</button>
      <button className="app-modal__primary" type="submit" form="step-text-form" disabled={!value.trim()}>
        {isEdit ? 'Сохранить' : 'Добавить'}
      </button>
    </>}>
      {(requestClose) => <form id="step-text-form" className="app-modal__form" onSubmit={(event) => submit(event, requestClose)}>
        <label htmlFor="step-text-input">{isEdit ? 'Название шага' : 'Название подпункта'}</label>
        <input id="step-text-input" autoFocus value={value}
          placeholder={isEdit ? 'Название шага' : 'Например, найти нужный материал'}
          onChange={(event) => setValue(event.target.value)} />
      </form>}
    </AppModal>
  );
}
