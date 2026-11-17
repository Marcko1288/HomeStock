export function EmptyState({ icon: Icon, emoji, title, children, action, tone }) {
  return (
    <div className={`empty ${tone ? `empty--${tone}` : ""}`}>
      {emoji ? (
        <div className="empty__emoji" aria-hidden="true">
          {emoji}
        </div>
      ) : (
        Icon && (
          <div className="empty__icon" aria-hidden="true">
            <Icon />
          </div>
        )
      )}
      <h2 className="empty__title">{title}</h2>
      {children && <p className="empty__text">{children}</p>}
      {action}
    </div>
  );
}
