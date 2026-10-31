import { useEffect, useState } from "react";
import {
  GlobeRegular,
  HomeRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from "@fluentui/react-icons";
import {
  Button,
  FluentProvider,
  Menu,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
  Toolbar,
  Tooltip,
} from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../api";
import i18n, { SUPPORTED_LANGUAGES, resolveLanguage } from "../i18n";
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
  const { t } = useTranslation();
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
  const themeLabel = t(`theme.${preference}`);
  const currentLanguage = resolveLanguage([i18n.language]);

  return (
    <FluentProvider theme={resolvedTheme === "dark" ? darkTheme : lightTheme}>
      <div className="app-frame">
        <header className="site-header">
          <Toolbar className="site-toolbar" aria-label={t("app.headerLabel")}>
            <NavLink
              className="brand-lockup"
              to="/"
              aria-label={t("app.homeLabel")}
            >
              <span className="brand-mark">
                <HomeRegular />
              </span>
              <span>
                <Text weight="semibold" className="brand-name">
                  {t("app.name")}
                </Text>
                <Text size={200} className="brand-place">
                  {t("app.place")}
                </Text>
              </span>
            </NavLink>
            <div className="header-side">
              <Text className="network-status" role="status">
                <span
                  className={`status-dot${serviceStatus === "unavailable" ? " status-dot--offline" : ""}`}
                />
                {t(`service.${serviceStatus}`)}
              </Text>
              <Menu
                checkedValues={{ language: [currentLanguage] }}
                onCheckedValueChange={(_, data) => {
                  const next = data.checkedItems[0];
                  if (next) void i18n.changeLanguage(next);
                }}
              >
                <MenuTrigger disableButtonEnhancement>
                  <Tooltip content={t("language.label")} relationship="label">
                    <Button
                      appearance="subtle"
                      icon={<GlobeRegular />}
                      aria-label={t("language.label")}
                    />
                  </Tooltip>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    {SUPPORTED_LANGUAGES.map((language) => (
                      <MenuItemRadio
                        key={language}
                        name="language"
                        value={language}
                      >
                        {t(`language.${language}`)}
                      </MenuItemRadio>
                    ))}
                  </MenuList>
                </MenuPopover>
              </Menu>
              <Tooltip
                content={t("theme.tooltip", { theme: themeLabel })}
                relationship="label"
              >
                <Button
                  appearance="subtle"
                  icon={themeIcon}
                  aria-label={t("theme.aria", { theme: themeLabel })}
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
          <Text size={200}>{t("app.footer")}</Text>
          <NavLink className="footer-link" to="/privacy">
            {t("app.privacy")}
          </NavLink>
        </footer>
      </div>
    </FluentProvider>
  );
}
