import { ResearchOpportunityMap } from "./ResearchOpportunityMap";
import { GAP_ASPECTS, isGap, type GapItem } from "../data/gapSample";

interface Props {
  items: GapItem[];
  fields: { key: string; label: string; token: string }[];
  aspects: string[];
  densityThreshold: number;
  interestThreshold: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function GapMatrix({
  items,
  fields,
  aspects,
  densityThreshold,
  interestThreshold,
  selectedId,
  onSelect,
}: Props) {
  const shownAspects = (aspects.length ? aspects : GAP_ASPECTS).filter(Boolean);

  return (
    <ResearchOpportunityMap
      items={items.map((item) => ({
        id: item.id,
        fieldKey: item.fieldKey,
        fieldLabel: item.fieldLabel,
        aspect: item.aspect,
        density: item.density,
        papers: item.papers,
        gap: isGap(item, densityThreshold),
        interest: item.interest,
        score: item.score,
      }))}
      fields={fields}
      aspects={shownAspects}
      densityThreshold={densityThreshold}
      interestThreshold={interestThreshold}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}
