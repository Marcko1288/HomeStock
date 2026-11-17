import { NavLink } from "react-router";
import { House, Boxes, ScanBarcode, ShoppingCart, Ellipsis } from "lucide-react";

export function TabBar({ shoppingCount = 0 }) {
  const item = (to, label, Icon, badge, end) => (
    <NavLink to={to} end={end} className={({ isActive }) => `tab ${isActive ? "is-active" : ""}`}>
      <span className="tab__icon">
        <Icon aria-hidden="true" />
        {badge > 0 && (
          <span className="tab__badge" aria-label={`${badge} da comprare`}>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="tab__label">{label}</span>
    </NavLink>
  );
  return (
    <nav className="tabbar" aria-label="Navigazione principale">
      {item("/", "Home", House, 0, true)}
      {item("/scorte", "Scorte", Boxes)}
      <NavLink to="/scansiona" className="tab tab--scan" aria-label="Scansiona barcode">
        <span className="tab__scan">
          <ScanBarcode aria-hidden="true" />
        </span>
        <span className="tab__label">Scansiona</span>
      </NavLink>
      {item("/spesa", "Spesa", ShoppingCart, shoppingCount)}
      {item("/altro", "Altro", Ellipsis)}
    </nav>
  );
}
