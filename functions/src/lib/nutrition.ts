import densityTable from "../shared/data/foodDensity.json";

type DensityRow = {
  caloriesPer100g: number;
  macros: { p: number; c: number; f: number };
};

// Filter out non-food entries (like "comment", "_PROTEINS", etc.)
const foods: Record<string, DensityRow> = Object.fromEntries(
  Object.entries(densityTable).filter(
    ([key, value]) =>
      typeof value === "object" &&
      value !== null &&
      "caloriesPer100g" in value &&
      "macros" in value
  )
) as Record<string, DensityRow>;

export type MacroTotals = {
  calories: number;
  p: number;
  c: number;
  f: number;
};

export function estimateItem(name: string, grams: number) {
  const key = name.toLowerCase();
  const fallback: DensityRow = foods[key] ?? {
    caloriesPer100g: 150,
    macros: { p: 8, c: 15, f: 5 },
  };

  const factor = grams / 100;
  return {
    calories: Math.round(fallback.caloriesPer100g * factor),
    macros: {
      p: +(fallback.macros.p * factor).toFixed(1),
      c: +(fallback.macros.c * factor).toFixed(1),
      f: +(fallback.macros.f * factor).toFixed(1),
    },
  };
}

export function mergeTotals(items: MacroTotals[]): MacroTotals {
  return items.reduce(
    (acc, curr) => ({
      calories: acc.calories + curr.calories,
      p: +(acc.p + curr.p).toFixed(1),
      c: +(acc.c + curr.c).toFixed(1),
      f: +(acc.f + curr.f).toFixed(1),
    }),
    { calories: 0, p: 0, c: 0, f: 0 }
  );
}
