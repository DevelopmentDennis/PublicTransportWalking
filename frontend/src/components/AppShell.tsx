import { useEffect, useState } from "react";
import {
  HomeRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from "@fluentui/react-icons";
import {
  Button,
  FluentProvider,
  Text,
  Toolbar,
  Tooltip,
} from "@fluentui/react-components";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../api";
import { darkTheme, lightTheme } from "../theme";

type ThemePreference = "light" | "dark" | "system";

function readThemePreference(): ThemePreference {
  const stored = window.localStorage.getItem("app-theme");
  if (stored === "light" || stored === "dark" || stored === "system")
    return stored;
  return "system";
}

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function AppShell() {
  const [preference, setPreference] =
    useState<ThemePreference>(readThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
    resolveTheme(readThemePreference()),
  );
  const [serviceStatus, setServiceStatus] = useState<
    "checking" | "connected" | "unavailable"
  >("checking");

  useEffect(() => {
    let active = true;
    api
      .getServiceHealth()
      .then((health) => {
        if (active) {
          setServiceStatus(
            health.status === "healthy" &&
              health.services.functions === "healthy" &&
              health.services.walkingRoutes === "configured"
              ? "connected"
              : "unavailable",
          );
        }
      })
      .catch(() => {
        if (active) setServiceStatus("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) =>
      setResolvedTheme(event.matches ? "dark" : "light");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  function cycleTheme(): void {
    const next: ThemePreference =
      preference === "light"
        ? "dark"
        : preference === "dark"
          ? "system"
          : "light";
    window.localStorage.setItem("app-theme", next);
    setPreference(next);
    setResolvedTheme(resolveTheme(next));
  }

  const themeIcon =
    resolvedTheme === "dark" ? <WeatherSunnyRegular /> : <WeatherMoonRegular />;
  const themeLabel =
    preference === "system" ? "System theme" : `${preference} theme`;

  return (
    <FluentProvider theme={resolvedTheme === "dark" ? darkTheme : lightTheme}>
      <div className="app-frame">
        <header className="site-header">
          <Toolbar className="site-toolbar" aria-label="Application header">
            <NavLink
              className="brand-lockup"
              to="/"
              aria-label="Public Transport Walking home"
            >
              <span className="brand-mark">
                <HomeRegular />
              </span>
              <span>
                <Text weight="semibold" className="brand-name">
                  Public Transport Walking
                </Text>
                <Text size={200} className="brand-place">
                  Augsburg network
                </Text>
              </span>
            </NavLink>
            <div className="header-side">
              <Text className="network-status" role="status">
                <span
                  className={`status-dot${serviceStatus === "unavailable" ? " status-dot--offline" : ""}`}
                />
                {serviceStatus === "connected"
                  ? "Walking service connected"
                  : serviceStatus === "unavailable"
                    ? "Walking service unavailable"
                    : "Checking walking service"}
              </Text>
              <Tooltip
                content={`Change appearance · ${themeLabel}`}
                relationship="label"
              >
                <Button
                  appearance="subtle"
                  icon={themeIcon}
                  aria-label={`Change appearance. Current setting: ${themeLabel}`}
                  onClick={cycleTheme}
                />
              </Tooltip>
            </div>
          </Toolbar>
        </header>

        <main className="page-main">
          <Outlet />
        </main>

        <footer className="site-footer">
          <Text size={200}>Public Transport Walking · Augsburg</Text>
          <Text size={200}>
            Local transit assets · Walking estimates via route service
          </Text>
        </footer>
      </div>
    </FluentProvider>
  );
}
