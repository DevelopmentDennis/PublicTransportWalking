import { Text, Title1 } from "@fluentui/react-components";
import { motion } from "motion/react";

export function PrivacyPolicyPage() {
  return (
    <motion.div
      className="page-flow privacy-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <section className="data-intro" aria-labelledby="privacy-title">
        <Title1 id="privacy-title">Privacy Policy</Title1>
        <Text>
          This policy explains what information the Public Transport Walking
          app handles when you plan a walk to your next transit stop in the
          Augsburg network.
        </Text>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-no-data">
        <h2 id="privacy-no-data">No personal data collection</h2>
        <p>
          The app does not require an account, does not use tracking cookies,
          and does not collect personal data. Route lookups are based solely
          on the transit line, station, and direction you select in the form.
        </p>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-storage">
        <h2 id="privacy-storage">Local browser storage</h2>
        <p>
          Your appearance preference (light, dark, or system theme) is saved
          in your browser&apos;s local storage so the app remembers it on your
          next visit. This setting never leaves your device. You can remove it
          at any time by clearing your browser&apos;s site data.
        </p>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-requests">
        <h2 id="privacy-requests">Route lookup requests</h2>
        <p>
          When you request a walking route, the selected line, station, and
          direction are sent to the app&apos;s own walking route service to
          compute the result. These selections are not linked to your identity
          and are not used for profiling or advertising.
        </p>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-third-party">
        <h2 id="privacy-third-party">Third-party services</h2>
        <p>
          Route results may include a link that opens the destination in
          Google Maps. When you follow that link, Google&apos;s own privacy
          policy applies to any data processed on their site. No map or
          location data is loaded from third parties while you stay in this
          app.
        </p>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-changes">
        <h2 id="privacy-changes">Changes to this policy</h2>
        <p>
          This privacy policy may be updated as the app evolves. The current
          version is always available on this page.
        </p>
      </section>
    </motion.div>
  );
}
