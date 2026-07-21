import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { formatCompact } from '../lib/format';
import type { TrendPoint, TrendSeries } from '../data/types';

interface Props {
  data: TrendPoint[];
  series: TrendSeries[];
}

export function TrendChart({ data, series }: Props) {
  const { theme } = useTheme();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [chartWidth, setChartWidth] = useState<number>(0);

  const toggle = (key: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      if (next.size === series.length) return prev;
      return next;
    });
  };

  const chartData = {
    labels: data.map(d => d.period),
    datasets: series
      .filter(s => !hidden.has(s.key))
      .map(s => {
        // Find the color based on token string. Example: "--c1", "--c2"
        let colorStr = theme.primary; // fallback
        if (s.token === '--c1') colorStr = theme.primary;
        if (s.token === '--c2') colorStr = '#8a2be2'; // indigo roughly
        if (s.token === '--c3') colorStr = theme.warning;
        if (s.token === '--c4') colorStr = '#ff1493'; // magenta roughly
        if (s.token === '--c5') colorStr = theme.success;
        if (s.token === '--c6') colorStr = '#ffa500'; // orange roughly

        return {
          data: data.map(d => Number(d[s.key] || 0)),
          color: () => colorStr,
          strokeWidth: 2,
        };
      }),
  };

  return (
    <View style={styles.container} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
      {/* Legend */}
      <View style={styles.legend}>
        {series.map((s, idx) => {
          const off = hidden.has(s.key);
          let colorStr = theme.primary;
          if (s.token === '--c1') colorStr = theme.primary;
          if (s.token === '--c2') colorStr = '#8a2be2';
          if (s.token === '--c3') colorStr = theme.warning;
          if (s.token === '--c4') colorStr = '#ff1493';
          if (s.token === '--c5') colorStr = theme.success;
          if (s.token === '--c6') colorStr = '#ffa500';

          return (
            <TouchableOpacity 
              key={`${s.key}-${idx}`} 
              style={[styles.legendChip, off && { opacity: 0.5 }]} 
              onPress={() => toggle(s.key)}
            >
              <View style={[styles.legendDot, { backgroundColor: colorStr }]} />
              <Text variant="xs">{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chart */}
      {chartWidth > 0 && (
        <LineChart
          data={chartData}
          width={chartWidth}
          height={220}
          yAxisSuffix=""
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: theme.surface,
            backgroundGradientFrom: theme.surface,
            backgroundGradientTo: theme.surface,
            decimalPlaces: 0,
            color: (opacity = 1) => theme.borderStrong,
            labelColor: (opacity = 1) => theme.inkMuted,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "4",
            },
            propsForBackgroundLines: {
              strokeDasharray: "0" // solid background lines
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 8,
            marginLeft: -10,
          }}
          formatYLabel={(y) => formatCompact(Number(y))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  }
});
