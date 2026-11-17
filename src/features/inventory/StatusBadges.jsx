import { Badge } from "../../components/ui/Badge.jsx";
import { describeExpiry, formatShortDate } from "../../utils/date.js";

/** Badge di stato (scadenza + scorta). `long` usa testi estesi per il dettaglio. */
export function StatusBadges({ product, status, long = false }) {
  const badges = [];
  if (status.expired) {
    badges.push(
      <Badge key="exp" tone="red">
        {long ? describeExpiry(status.daysLeft, product.expiryDate) : "Scaduto"}
      </Badge>,
    );
  } else if (status.expiring) {
    const text =
      status.daysLeft === 0
        ? "Scade oggi"
        : status.daysLeft === 1
          ? "Scade domani"
          : long
            ? describeExpiry(status.daysLeft, product.expiryDate)
            : `Scade il ${formatShortDate(product.expiryDate)}`;
    badges.push(
      <Badge key="exp" tone="orange">
        {text}
      </Badge>,
    );
  }
  if (status.out) badges.push(<Badge key="stock" tone="gray">Esaurito</Badge>);
  else if (status.low) badges.push(<Badge key="stock" tone="yellow">Sotto soglia</Badge>);
  if (!badges.length) return null;
  return <span className="badges">{badges}</span>;
}
