import { lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { DataProvider } from "./DataProvider.jsx";
import { AppLayout } from "./AppLayout.jsx";
import HomePage from "../features/dashboard/HomePage.jsx";

const InventoryPage = lazy(() => import("../features/inventory/InventoryPage.jsx"));
const ProductDetailSheet = lazy(() => import("../features/inventory/ProductDetailSheet.jsx"));
const NewProductSheet = lazy(() => import("../features/inventory/NewProductSheet.jsx"));
const ScannerPage = lazy(() => import("../features/scanner/ScannerPage.jsx"));
const ShoppingPage = lazy(() => import("../features/shopping/ShoppingPage.jsx"));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage.jsx"));
const ListEditorPage = lazy(() =>
  import("../features/settings/SettingsPage.jsx").then((m) => ({ default: m.ListEditorPage })),
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Non scorre quando si apre/chiude un pannello sopra la lista.
    if (!/^\/scorte\/.+/.test(pathname)) window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function AuthedApp() {
  return (
    <DataProvider>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="scorte" element={<InventoryPage />}>
            <Route path="nuovo" element={<NewProductSheet />} />
            <Route path=":id" element={<ProductDetailSheet />} />
          </Route>
          <Route path="scansiona" element={<ScannerPage />} />
          <Route path="spesa" element={<ShoppingPage />} />
          <Route path="altro" element={<SettingsPage />} />
          <Route path="altro/luoghi" element={<ListEditorPage kind="locations" />} />
          <Route path="altro/categorie" element={<ListEditorPage kind="categories" />} />
          <Route path="login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}


