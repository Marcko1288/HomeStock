/** Intestazione con titolo grande stile iOS, rispetta la safe area superiore. */
export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <header className="page-header">
      <div className="page-header__row">
        <div className="page-header__titles">
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
          <h1 className="page-header__title">{title}</h1>
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
