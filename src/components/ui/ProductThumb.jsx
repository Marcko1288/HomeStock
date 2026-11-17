import { useState } from "react";
import { Package } from "lucide-react";

export function ProductThumb({ src, size = 48, alt = "" }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="thumb" style={{ width: size, height: size }}>
      {src && !broken ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBroken(true)} />
      ) : (
        <Package aria-hidden="true" />
      )}
    </span>
  );
}
