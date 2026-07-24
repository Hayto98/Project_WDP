import { useMemo } from "react";
import type { AxisOption, GapCell } from "../data/types";
import { ResearchOpportunityMap } from "./ResearchOpportunityMap";

interface Props {
  fields: Array<string | AxisOption>;
  aspects: Array<string | AxisOption>;
  gaps: GapCell[];
}

export function ResearchGapHeatmap({ fields, aspects, gaps }: Props) {
  const fieldItems = useMemo(
    () => fields.map(normalizeAxisItem).filter(Boolean) as AxisOption[],
    [fields],
  );
  const aspectItems = useMemo(
    () => aspects.map(normalizeAxisItem).filter(Boolean) as AxisOption[],
    [aspects],
  );
  const items = useMemo(
    () =>
      fieldItems.flatMap((field) =>
        aspectItems.map((aspect) => {
          const gap = findCell(gaps, field.label, aspect.label);
          return {
            id: `${field.key}::${aspect.key}`,
            fieldKey: field.key,
            fieldLabel: field.label,
            aspect: aspect.label,
            density: gap.density,
            interest: gap.interest,
            score: gap.score,
            papers: gap.papers,
            gap: gap.gap,
          };
        }),
      ),
    [fieldItems, aspectItems, gaps],
  );

  return <ResearchOpportunityMap items={items} mode="summary" />;
}

function findCell(gaps: GapCell[], field: string, aspect: string): GapCell {
  return gaps.find((gap) => sameAxis(gap.field, field) && sameAxis(gap.aspect, aspect)) ?? {
    field,
    aspect,
    density: 0,
    papers: 0,
    gap: false,
  };
}

function normalizeAxisItem(value: string | Partial<AxisOption> | null | undefined): AxisOption | null {
  if (typeof value === "string") return { key: value, label: value };
  if (!value) return null;
  const label = value.label || value.key;
  if (!label) return null;
  return { key: value.key || label, label };
}

function sameAxis(a: unknown, b: string) {
  if (typeof a === "string") return a === b;
  if (a && typeof a === "object") {
    const item = normalizeAxisItem(a as Partial<AxisOption>);
    return item?.label === b || item?.key === b;
  }
  return false;
}
