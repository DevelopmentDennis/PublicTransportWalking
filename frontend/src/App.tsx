import { lazy, Suspense } from "react";
import { Spinner } from "@fluentui/react-components";
import { AnimatePresence } from "motion/react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";

const WalkingRouteFinder = lazy(() =>
  import("./pages/WalkingRouteFinder").then((module) => ({
    default: module.WalkingRouteFinder,
  })),
);

function RoutedPages() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<AppShell />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<Spinner label="Loading route finder" />}>
                <WalkingRouteFinder />
              </Suspense>
            }
          />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoutedPages />
    </BrowserRouter>
  );
}
