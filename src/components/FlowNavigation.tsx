import { useLanguage } from './LanguageProvider';

type Props = {
  onBack?: () => void;
  onClose: () => void;
  isClosing?: boolean;
};

export function FlowNavigation({ onBack, onClose, isClosing = false }: Props) {
  const { language } = useLanguage();
  const backLabel = language === 'en' ? 'Back' : 'Назад';
  const closeLabel = language === 'en' ? 'Close and delete task' : 'Закрыть и удалить задачу';

  return (
    <div className="flow-navigation">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label={backLabel} title={backLabel}>
          <span aria-hidden="true">←</span>
        </button>
      ) : <span className="flow-navigation__spacer" aria-hidden="true" />}
      <button type="button" onClick={onClose} disabled={isClosing}
        aria-label={closeLabel} title={closeLabel}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
