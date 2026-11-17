import { lazy, Suspense } from "react";
import { BrowserRouter } from "react-router";
import { AuthProvider, useAuth } from "./AuthProvider.jsx";
import { ThemeProvider } from "./ThemeProvider.jsx";
import { ToastProvider } from "./ToastProvider.jsx";
import { UpdateProvider } from "./UpdatePrompt.jsx";
import LoginPage from "./LoginPage.jsx";

const AuthedApp = lazy(() => import("./AuthedApp.jsx"));

function Splash() {
  return (
    <div className="splash" aria-busy="true" aria-label="Caricamento">
      <img src="/icon.svg" alt="" width="72" height="72" />
    </div>
  );
}

function Gate() {
  const { user } = useAuth();
  if (user === undefined) return <Splash />;
  if (!user) return <LoginPage />;
  return (
    <Suspense fallback={<Splash />}>
      <AuthedApp key={user.uid} />
    </Suspense>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <UpdateProvider>
          <AuthProvider>
            <BrowserRouter>
              <Gate />
            </BrowserRouter>
          </AuthProvider>
        </UpdateProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
