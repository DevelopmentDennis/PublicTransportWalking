import { Text, Title1 } from "@fluentui/react-components";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

export function PrivacyPolicyPage() {
  const { t } = useTranslation();

  return (
    <motion.div
      className="page-flow privacy-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <section className="data-intro" aria-labelledby="privacy-title">
        <Title1 id="privacy-title">{t("privacy.title")}</Title1>
        <Text>{t("privacy.intro")}</Text>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-controller">
        <h2 id="privacy-controller">{t("privacy.controllerTitle")}</h2>
        <p>{t("privacy.controllerText")}</p>
        <p>
          <strong>Dennis Ostertag</strong><br />
          {t("privacy.email")}: <a href="mailto:mail@dennisostertag.de">mail@dennisostertag.de</a>
        </p>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-hosting">
        <h2 id="privacy-hosting">{t("privacy.hostingTitle")}</h2>
        <p>{t("privacy.hostingText")}</p>
        <p>{t("privacy.hostingBasis")}</p>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-routes">
        <h2 id="privacy-routes">{t("privacy.routesTitle")}</h2>
        <p>{t("privacy.routesText")}</p>
        <p>{t("privacy.routesGoogle")}</p>
        <p>{t("privacy.routesBasis")}</p>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-fonts">
        <h2 id="privacy-fonts">{t("privacy.fontsTitle")}</h2>
        <p>{t("privacy.fontsText")}</p>
        <p>{t("privacy.fontsBasis")}</p>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-maps">
        <h2 id="privacy-maps">{t("privacy.mapsTitle")}</h2>
        <p>{t("privacy.mapsText")}</p>
        <p>
          {t("privacy.googlePolicy")}{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            https://policies.google.com/privacy
          </a>
        </p>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-storage">
        <h2 id="privacy-storage">{t("privacy.storageTitle")}</h2>
        <p>{t("privacy.storageText")}</p>
        <p>{t("privacy.trackingText")}</p>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-rights">
        <h2 id="privacy-rights">{t("privacy.rightsTitle")}</h2>
        <p>{t("privacy.rightsText")}</p>
        <p>{t("privacy.rightsContact")}</p>
        <p>{t("privacy.complaint")}</p>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-changes">
        <h2 id="privacy-changes">{t("privacy.changesTitle")}</h2>
        <p>{t("privacy.changesText")}</p>
      </section>
    </motion.div>
  );
}
