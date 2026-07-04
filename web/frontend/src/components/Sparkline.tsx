interface Props {
  values: number[];
  token: string;
  width?: number;
  height?: number;
}

export function Sparkline({ values, token, width = 92, height = 30 }: Props) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const pad = 3;
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);
  const pts = values.map((v, i) => `${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M${pts.join(" L")}`;
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} className="spark" aria-hidden>
      <path d={area} fill={`var(${token})`} fillOpacity={0.1} stroke="none" />
      <path d={line} fill="none" stroke={`var(${token})`} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={width} cy={y(values[values.length - 1])} r={2.4} fill={`var(${token})`} />
    </svg>
  );
}
