import { VehicleBusRegular } from "@fluentui/react-icons";
import { Text, Title1, Button } from "@fluentui/react-components";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-illustration" aria-hidden="true">
        <div className="not-found-route-line" />
        <div className="not-found-board">
          <span>UNPLANNED DETOUR</span>
          <strong>404</strong>
          <span>NO SUCH STOP</span>
        </div>
        <span className="not-found-bus">
          <VehicleBusRegular />
        </span>
      </div>
      <div className="not-found-copy">
        <span className="not-found-eyebrow">ROUTE DEVIATION</span>
        <Title1 id="not-found-title">Wrong stop.</Title1>
        <Text>
          This page took the bus in the wrong direction. Even the driver says
          it&apos;s not on the route map.
        </Text>
        <Button
          as="button"
          type="button"
          appearance="primary"
          aria-label="Back to the route finder"
          onClick={() => navigate("/", { replace: true })}
        >
          Back to the route finder
        </Button>
      </div>
    </section>
  );
}
