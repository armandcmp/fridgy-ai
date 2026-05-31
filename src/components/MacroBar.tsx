interface Props {
  p: number;
  g: number;
  l: number;
  showLegend?: boolean;
}

export function MacroBar({ p, g, l, showLegend = true }: Props) {
  const pk = p * 4;
  const gk = g * 4;
  const lk = l * 9;
  const total = pk + gk + lk || 1;
  const pPct = (pk / total) * 100;
  const gPct = (gk / total) * 100;
  const lPct = (lk / total) * 100;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div style={{ width: `${pPct}%`, background: "var(--protein)" }} />
        <div style={{ width: `${gPct}%`, background: "var(--carbs)" }} />
        <div style={{ width: `${lPct}%`, background: "var(--fat)" }} />
      </div>
      {showLegend && (
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>
            <span
              className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
              style={{ background: "var(--protein)" }}
            />
            P : {Math.round(p)}g
          </span>
          <span>
            <span
              className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
              style={{ background: "var(--carbs)" }}
            />
            G : {Math.round(g)}g
          </span>
          <span>
            <span
              className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
              style={{ background: "var(--fat)" }}
            />
            L : {Math.round(l)}g
          </span>
        </div>
      )}
    </div>
  );
}
