const tasks = [
  { title: 'Разобрать фотографии', step: 'Создана папка «Лето»', time: 'Вчера' },
  { title: 'Начать книгу', step: 'Прочитаны первые 3 страницы', time: '2 дня назад' },
];

export function RecentTasks() {
  return (
    <section className="recent-section" id="recent" aria-labelledby="recent-title">
      <div className="section-heading"><h2 id="recent-title">Продолжить начатое</h2><button type="button">Все задачи</button></div>
      <div className="recent-list">
        {tasks.map((task) => (
          <article className="recent-card" key={task.title}>
            <span className="recent-card__check" aria-hidden="true">✓</span>
            <div><h3>{task.title}</h3><p>{task.step} · {task.time}</p></div>
            <button type="button" aria-label={`Продолжить: ${task.title}`}>→</button>
          </article>
        ))}
      </div>
    </section>
  );
}
