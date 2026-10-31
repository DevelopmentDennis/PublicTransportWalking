import { VehicleBusRegular } from "@fluentui/react-icons";
import { Text, Title1, Button } from "@fluentui/react-components";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-illustration" aria-hidden="true">
        <div className="not-found-route-line" />
        <div className="not-found-board">
          <span>{t("notFound.board1")}</span>
          <strong>404</strong>
          <span>{t("notFound.board2")}</span>
        </div>
        <span className="not-found-bus">
          <VehicleBusRegular />
        </span>
      </div>
      <div className="not-found-copy">
        <span className="not-found-eyebrow">{t("notFound.eyebrow")}</span>
        <Title1 id="not-found-title">{t("notFound.title")}</Title1>
        <Text>{t("notFound.text")}</Text>
        <Button
          as="button"
          type="button"
          appearance="primary"
          aria-label={t("notFound.back")}
          onClick={() => navigate("/", { replace: true })}
        >
          {t("notFound.back")}
        </Button>
      </div>
    </section>
  );
}
