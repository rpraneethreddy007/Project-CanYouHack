// ScoreBadge. Per ISSUES.md #18:
// "each row showing the ScoreBadge breakdown (peer % / ai-ref % / perplexity %)".
//
// Acceptance criteria: "the % breakdown per row visually sums to the badge's total".
//
// Props:
//   totalScore         — float 0–1 (raw flag_score from backend)
//   peerWeightPct      — float 0–100
//   aiRefWeightPct     — float 0–100
//   perplexityWeightPct — float 0–100
//
// The three segments of the stacked bar are proportional to peerWeightPct,
// aiRefWeightPct, and perplexityWeightPct. Because the backend stores
// these as % of total_score already (not raw signal values), they always
// sum to 100% when total_score > 0, matching the acceptance criterion.
export default function ScoreBadge({ totalScore, peerWeightPct, aiRefWeightPct, perplexityWeightPct }) {
  const pct = Math.round(totalScore * 100);

  // Severity tier drives the total-score colour:
  //   high (≥70)  → brick (red)
  //   mid (≥40)   → amber
  //   low (<40)   → ink-soft (grey, below the flagging threshold but shown anyway)
  const scoreColor =
    pct >= 70 ? "text-brick" : pct >= 40 ? "text-amber-dark" : "text-ink-soft";

  return (
    <div className="flex flex-col gap-1.5 min-w-[120px]">
      {/* Total score number */}
      <span className={`font-display text-xl font-bold leading-none ${scoreColor}`}>
        {pct}
        <span className="text-sm font-normal text-ink-faint ml-0.5">/ 100</span>
      </span>

      {/* Stacked bar */}
      <div className="h-2 w-full rounded-full bg-paper-line overflow-hidden flex">
        <Segment width={peerWeightPct} color="bg-brick" title={`Peer similarity: ${Math.round(peerWeightPct)}%`} />
        <Segment width={aiRefWeightPct} color="bg-amber" title={`AI reference: ${Math.round(aiRefWeightPct)}%`} />
        <Segment width={perplexityWeightPct} color="bg-cobalt" title={`Perplexity: ${Math.round(perplexityWeightPct)}%`} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        <LegendDot color="bg-brick" label={`Peer ${Math.round(peerWeightPct)}%`} />
        <LegendDot color="bg-amber" label={`AI ref ${Math.round(aiRefWeightPct)}%`} />
        <LegendDot color="bg-cobalt" label={`PPL ${Math.round(perplexityWeightPct)}%`} />
      </div>
    </div>
  );
}

function Segment({ width, color, title }) {
  if (!width || width <= 0) return null;
  return (
    <div
      className={`${color} h-full`}
      style={{ width: `${width}%` }}
      title={title}
    />
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />
      <span className="text-[11px] text-ink-soft">{label}</span>
    </span>
  );
}
