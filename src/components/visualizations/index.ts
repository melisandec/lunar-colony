/**
 * Barrel exports for all visualization components.
 *
 * Import from "@/components/visualizations" for convenience.
 */

// SVG data visualizations
export { Sparkline, InlineSparkline } from "./sparkline";
export type { SparklineProps, SparklinePoint } from "./sparkline";

export { DonutChart } from "./donut-chart";
export type { DonutChartProps, DonutSegment } from "./donut-chart";

export { EfficiencyGauge, MiniGauge } from "./efficiency-gauge";
export type { EfficiencyGaugeProps } from "./efficiency-gauge";

export {
  FillMeter,
  ResourceFillMeter,
  StackedFillMeter,
  resourceColor,
} from "./fill-meter";
export type { FillMeterProps, StackedSegment } from "./fill-meter";

export { MarketDepthViz } from "./market-depth";
export type { MarketDepthVizProps } from "./market-depth";

// Status indicators
export {
  MoraleIndicator,
  StatusDot,
  SeverityBadge,
  TrendArrow,
  AlertPulse,
} from "./status-indicators";
export type {
  MoraleIndicatorProps,
  StatusDotProps,
  StatusLevel,
  SeverityBadgeProps,
  Severity,
  TrendArrowProps,
  AlertPulseProps,
} from "./status-indicators";

// Live displays & countdowns
export {
  LiveCounter,
  CountdownDisplay,
  TickCountdown,
  EventCountdown,
  MarketTicker,
} from "./live-displays";
export type {
  LiveCounterProps,
  CountdownDisplayProps,
  EventCountdownProps,
  MarketTickerItem,
  MarketTickerProps,
} from "./live-displays";

// Canvas visualizations
export { ResourceFlow } from "./resource-flow";
export type { ResourceFlowProps, FlowNode } from "./resource-flow";

// Visual hierarchy
export { ImportanceContainer, StatCard, DataSection } from "./visual-hierarchy";
export type {
  ImportanceLevel,
  ImportanceContainerProps,
  StatCardProps,
  DataSectionProps,
} from "./visual-hierarchy";
