import { afterEach, describe, expect, it } from "vitest";
import i18n, { resolveLanguage } from ".";
import { formatDistance, formatDuration } from "./format";
import de from "./locales/de.json";
import en from "./locales/en.json";

function keys(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === "object" && child !== null
      ? keys(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe("resolveLanguage", () => {
  it("uses the first supported browser language", () => {
    expect(resolveLanguage(["fr-FR", "de-AT", "en"])).toBe("de");
    expect(resolveLanguage(["en-GB"])).toBe("en");
  });

  it("falls back to English", () => {
    expect(resolveLanguage(["fr"])).toBe("en");
    expect(resolveLanguage(undefined)).toBe("en");
  });
});

describe("translations", () => {
  afterEach(() => i18n.changeLanguage("en"));

  it("define the same keys in every language", () => {
    expect(keys(de).sort()).toEqual(keys(en).sort());
  });

  it("format units per language", async () => {
    await i18n.changeLanguage("en");
    expect(formatDistance(1500)).toBe("1.5 km");
    expect(formatDuration(600)).toBe("10 min");
    await i18n.changeLanguage("de");
    expect(formatDistance(1500)).toBe("1,5 km");
    expect(formatDuration(600)).toBe("10 Min.");
  });
});
