import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { CloudOff } from "lucide-react";
import { TabBar } from "../components/ui/TabBar.jsx";
import { SkeletonList } from "../components/ui/Skeleton.jsx";
import { useOnlineStatus } from "../hooks/useOnlineStatus.js";
import { useShopping } from "../hooks/useShopping.js";
import { useData } from "./DataProvider.jsx";

function OfflineBanner() {
  const online = useOnlineStatus();
  const { pending } = useData();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      <CloudOff aria-hidden="true" />
      {pending ? "Offline — le modifiche verranno sincronizzate" : "Sei offline — i dati sono quelli salvati sul telefono"}
    </div>
  );
}

export function AppLayout() {
  const { open } = useShopping();
  const { pathname } = useLocation();
  const fullscreen = pathname.startsWith("/scansiona");
  return (
    <div className={`app ${fullscreen ? "app--fullscreen" : ""}`}>
      {!fullscreen && <OfflineBanner />}
      <main className="app__main">
        <Suspense
          fallback={
            <div className="page">
              <div className="page-header" />
              <SkeletonList />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      {!fullscreen && <TabBar shoppingCount={open.length} />}
    </div>
  );
}
