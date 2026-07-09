const nf = new Intl.NumberFormat("vi-VN");

export function formatInt(n: number): string {
  return nf.format(n);
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(".", ",") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(".", ",") + "K";
  return nf.format(n);
}

export function formatPercent(n: number): string {
  return `${n > 0 ? "+" : ""}${nf.format(n)}%`;
}
