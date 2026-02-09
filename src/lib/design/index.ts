/**
 * Lunar Colony Tycoon — Design System
 *
 * Barrel export for the complete visual design system.
 * Import everything from `@/lib/design` in consuming code.
 */

// Design tokens
export {
  colors,
  tierColors,
  resourceMeta,
  moduleMeta,
  typography,
  spacing,
  radii,
  gradients,
  FRAME,
  type TierKey,
  type ResourceKey,
  type GradientKey,
} from "./theme";

// Component library
export {
  FrameCanvas,
  Header,
  Footer,
  Section,
  Divider,
  SplitLayout,
  Panel,
  ModuleGridCell,
  Sparkline,
  DepthBar,
  InfoSidebar,
  StatRow,
  StatBadge,
  Badge,
  ResourceIndicator,
  ModuleCard,
  PriceRow,
  ProgressBar,
  StatusBanner,
  ToastBanner,
  GlowBorder,
  LunarLogo,
  BalanceDisplay,
  LevelBadge,
} from "./components";

// Screen templates
export {
  LandingScreen,
  HomeScreen,
  ColonyScreen,
  BuildScreen,
  MarketScreen,
  AllianceScreen,
  BuildResultScreen,
  TradeResultScreen,
  type HomeScreenProps,
  type ColonyScreenProps,
  type BuildScreenProps,
  type BuildItem,
  type MarketScreenProps,
  type MarketResource,
  type AllianceScreenProps,
  type BuildResultProps,
  type TradeResultProps,
} from "./templates";

// Animation sequences
export {
  productionCycleFrames,
  moduleConstructionFrames,
  lunarEarningFrames,
  levelUpFrames,
} from "./animations";

// Image optimization pipeline
export {
  MAX_IMAGE_BYTES,
  IMAGE_CACHE_HEADERS,
  wrapImageResponse,
  estimateImageSize,
  selectAnimationFrame,
  getFrameDimensions,
  validateImageResponse,
} from "./image-pipeline";
