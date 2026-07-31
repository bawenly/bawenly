type Props = {
  isComposite: boolean;
  isOpen: boolean;
  isPaused: boolean;
  onCollapse: () => void;
  onDelete: () => void;
  onPauseToggle: () => void;
  onToggle: () => void;
};

export function TaskActionsMenu(props: Props) {
  const { isComposite, isOpen, isPaused, onCollapse, onDelete, onPauseToggle, onToggle } = props;
  return (
    <div className="task-more">
      <button type="button" onClick={onToggle} aria-label="Дополнительные действия" aria-expanded={isOpen}>•••</button>
      {isOpen && (
        <div className="task-more__menu" role="menu">
          {isComposite && <button type="button" role="menuitem" onClick={onCollapse}>Свернуть шаги</button>}
          <button type="button" role="menuitem" onClick={onPauseToggle}>
            {isPaused ? 'Возобновить' : 'Поставить на паузу'}
          </button>
          <button className="task-more__delete" type="button" role="menuitem" onClick={onDelete}>
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}
