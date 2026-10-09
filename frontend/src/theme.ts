import {
  createDarkTheme,
  createLightTheme,
  type BrandVariants,
  type Theme,
} from "@fluentui/react-components";

const brandSteps = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160,
] as const;
const primary = "#176B5B";

function mixColor(color: string, target: string, amount: number): string {
  const channel = (source: number, destination: number) =>
    Math.round(source + (destination - source) * amount)
      .toString(16)
      .padStart(2, "0");
  const source =
    color.match(/[\da-f]{2}/gi)?.map((part) => Number.parseInt(part, 16)) ?? [];
  const destination =
    target.match(/[\da-f]{2}/gi)?.map((part) => Number.parseInt(part, 16)) ??
    [];
  if (source.length !== 3 || destination.length !== 3) return primary;
  return `#${channel(source[0]!, destination[0]!)}${channel(source[1]!, destination[1]!)}${channel(source[2]!, destination[2]!)}`;
}

const brandRamp = Object.fromEntries(
  brandSteps.map((step, index) => {
    const amount = index / (brandSteps.length - 1);
    const value =
      amount < 0.5
        ? mixColor(primary, "#FFFFFF", (0.5 - amount) * 1.65)
        : mixColor(primary, "#000000", (amount - 0.5) * 0.7);
    return [step, value];
  }),
) as BrandVariants;

export const lightTheme: Theme = createLightTheme(brandRamp);
export const darkTheme: Theme = createDarkTheme(brandRamp);
