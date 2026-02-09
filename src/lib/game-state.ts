/**
 * Game State Machine
 *
 * Manages screen transitions and action dispatch for the Frame flow.
 * Each interaction follows:  validate → load state → dispatch action → respond
 *
 * The state machine is stateless between requests — current screen is
 * encoded in the Frame's postUrl query params.
 */

import gameEngine, {
  type ColonyState,
  type ModuleState,
} from "@/lib/game-engine";
import {
  buildFrameResponse,
  type FrameResponse,
  type Screen,
} from "@/lib/frame-response";
import { type ModuleType } from "@/lib/utils";
import marketEngine, { type TradeResult } from "@/lib/market-engine";
import {
  rollRandomEvent,
  getActiveEvents,
  autoParticipateInActiveEvents,
} from "@/lib/event-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FrameAction {
  fid: number;
  buttonIndex: number;
  inputText?: string;
  /** The screen the user was on when they pressed the button */
  currentScreen: Screen;
}

export interface PlayerSnapshot {
  id: string;
  fid: number;
  username: string;
  state: ColonyState;
}

// ---------------------------------------------------------------------------
// State Machine
// ---------------------------------------------------------------------------

export class GameState {
  private player: PlayerSnapshot;

  private constructor(player: PlayerSnapshot) {
    this.player = player;
  }

  /** Load (or create) a player and return an initialised GameState. */
  static async load(fid: number, username?: string): Promise<GameState> {
    const raw = await gameEngine.getOrCreatePlayer(fid, username);
    const state = gameEngine.calculateColonyState(raw);

    return new GameState({
      id: raw.id,
      fid: raw.fid,
      username: raw.username ?? `player_${raw.fid}`,
      state,
    });
  }

  /** Get the player's database ID (for external use like trade endpoint). */
  getPlayerId(): string {
    return this.player.id;
  }

  // -----------------------------------------------------------------------
  // Action dispatch
  // -----------------------------------------------------------------------

  async handleAction(action: FrameAction): Promise<FrameResponse> {
    const { currentScreen, buttonIndex } = action;

    switch (currentScreen) {
      case "home":
        return this.handleHome(buttonIndex);
      case "colony":
        return this.handleColony(buttonIndex);
      case "build":
        return this.handleBuild(buttonIndex);
      case "market":
        return this.handleMarket(buttonIndex);
      case "alliance":
        return this.handleAlliance(buttonIndex);
      case "result":
        return this.handleResult(buttonIndex);
      default:
        return this.homeScreen();
    }
  }

  // -----------------------------------------------------------------------
  // Screen handlers
  // -----------------------------------------------------------------------

  /** HOME: Button 1=Produce, 2=Colony, 3=Market, 4=Alliance */
  private async handleHome(buttonIndex: number): Promise<FrameResponse> {
    switch (buttonIndex) {
      case 1:
        return this.runProductionCycle();
      case 2:
        return this.colonyScreen();
      case 3:
        return this.marketScreen();
      case 4:
        return this.allianceScreen();
      default:
        return this.homeScreen();
    }
  }

  /** COLONY: Button 1=Produce, 2=Build, 3=Modules, 4=Home */
  private async handleColony(buttonIndex: number): Promise<FrameResponse> {
    switch (buttonIndex) {
      case 1:
        return this.runProductionCycle();
      case 2:
        return this.buildScreen();
      case 3:
        return this.colonyScreen(); // Already showing modules
      case 4:
        return this.homeScreen();
      default:
        return this.homeScreen();
    }
  }

  /** BUILD: Button 1=Solar, 2=Mining, 3=Habitat, 4=Back */
  private async handleBuild(buttonIndex: number): Promise<FrameResponse> {
    if (buttonIndex === 4) {
      return this.colonyScreen();
    }

    const moduleMap: Record<number, ModuleType> = {
      1: "SOLAR_PANEL",
      2: "MINING_RIG",
      3: "HABITAT",
    };

    const moduleType = moduleMap[buttonIndex];
    if (!moduleType) return this.buildScreen();

    return this.executeBuild(moduleType);
  }

  /** MARKET: Button 1=Buy, 2=Sell, 3=Prices, 4=Home */
  private async handleMarket(buttonIndex: number): Promise<FrameResponse> {
    if (buttonIndex === 4) return this.homeScreen();

    // All market buttons show the market screen with live prices
    return this.marketScreen({
      action: buttonIndex === 1 ? "buy" : buttonIndex === 2 ? "sell" : "prices",
    });
  }

  /** ALLIANCE: Button 1=Members, 2=Contribute, 3=Rankings, 4=Home */
  private async handleAlliance(buttonIndex: number): Promise<FrameResponse> {
    if (buttonIndex === 4) return this.homeScreen();

    return this.allianceScreen({
      tab:
        buttonIndex === 1
          ? "members"
          : buttonIndex === 2
            ? "contribute"
            : "rankings",
    });
  }

  /** RESULT: Button 1=Build More, 2=Home */
  private async handleResult(buttonIndex: number): Promise<FrameResponse> {
    return buttonIndex === 1 ? this.buildScreen() : this.homeScreen();
  }

  // -----------------------------------------------------------------------
  // Core game actions
  // -----------------------------------------------------------------------

  /** Run production cycle — collect pending earnings for the player. */
  private async runProductionCycle(): Promise<FrameResponse> {
    const earnings = await gameEngine.collectEarnings(this.player.id);

    // Roll for random events on production action
    await rollRandomEvent("production", this.player.id).catch(() => {});
    await autoParticipateInActiveEvents(
      this.player.id,
      "production",
      earnings.collected,
    ).catch(() => {});

    // Refresh state after collection
    const raw = await gameEngine.getOrCreatePlayer(this.player.fid);
    const freshState = gameEngine.calculateColonyState(raw);
    this.player.state = freshState;

    return buildFrameResponse({
      screen: "home",
      fid: this.player.fid,
      imageParams: {
        collected: earnings.collected,
        balance: Math.floor(freshState.lunarBalance),
        production: freshState.productionRate,
        modules: freshState.modules.length,
        level: freshState.level,
      },
    });
  }

  /** Execute a module build and return a result screen. */
  private async executeBuild(moduleType: ModuleType): Promise<FrameResponse> {
    // Roll for random events on shop/build action
    await rollRandomEvent("shop_open", this.player.id).catch(() => {});

    const result = await gameEngine.buildModule(this.player.id, moduleType);

    if (!result.success) {
      return buildFrameResponse({
        screen: "result",
        fid: this.player.fid,
        imageParams: {
          success: 0,
          module: moduleType,
          error: result.error ?? "Unknown error",
        },
        buttons: [
          { label: "🔨 Try Again", action: "post" },
          { label: "🏠 Home", action: "post" },
        ],
      });
    }

    // Refresh state
    const raw = await gameEngine.getOrCreatePlayer(this.player.fid);
    this.player.state = gameEngine.calculateColonyState(raw);

    return buildFrameResponse({
      screen: "result",
      fid: this.player.fid,
      imageParams: {
        success: 1,
        module: moduleType,
        balance: Math.floor(this.player.state.lunarBalance),
        modules: this.player.state.modules.length,
      },
    });
  }

  // -----------------------------------------------------------------------
  // Screen builders
  // -----------------------------------------------------------------------

  async homeScreen(): Promise<FrameResponse> {
    const s = this.player.state;

    // Fetch active events for display
    const activeEvents = await getActiveEvents(this.player.id).catch(
      () => [] as Awaited<ReturnType<typeof getActiveEvents>>,
    );
    const eventBanner =
      activeEvents.length > 0 ? activeEvents[0]!.type : "none";
    const eventCount = activeEvents.length;

    return buildFrameResponse({
      screen: "home",
      fid: this.player.fid,
      imageParams: {
        balance: Math.floor(s.lunarBalance),
        production: s.productionRate,
        modules: s.modules.length,
        level: s.level,
        pending: s.pendingEarnings,
        name: this.player.username,
        eventBanner,
        eventCount,
      },
    });
  }

  async colonyScreen(): Promise<FrameResponse> {
    const s = this.player.state;

    // Roll for random events on colony view
    await rollRandomEvent("colony_view", this.player.id).catch(() => {});

    // Encode module summary for image generation
    const moduleSummary = summarizeModules(s.modules);
    return buildFrameResponse({
      screen: "colony",
      fid: this.player.fid,
      imageParams: {
        balance: Math.floor(s.lunarBalance),
        production: s.productionRate,
        moduleCount: s.modules.length,
        level: s.level,
        ...moduleSummary,
      },
    });
  }

  async buildScreen(): Promise<FrameResponse> {
    // Roll for random events on shop view
    await rollRandomEvent("shop_open", this.player.id).catch(() => {});

    const s = this.player.state;
    const solarCost = gameEngine.calculateModuleCost(
      "SOLAR_PANEL",
      s.modules.length,
    );
    const miningCost = gameEngine.calculateModuleCost(
      "MINING_RIG",
      s.modules.length,
    );
    const habitatCost = gameEngine.calculateModuleCost(
      "HABITAT",
      s.modules.length,
    );

    return buildFrameResponse({
      screen: "build",
      fid: this.player.fid,
      imageParams: {
        balance: Math.floor(s.lunarBalance),
        solarCost,
        miningCost,
        habitatCost,
        moduleCount: s.modules.length,
      },
    });
  }

  async marketScreen(extra?: { action?: string }): Promise<FrameResponse> {
    const overview = await marketEngine.getMarketOverview(this.player.id);

    // Encode prices for image generation
    const priceParams: Record<string, string | number> = {
      balance: Math.floor(this.player.state.lunarBalance),
      action: extra?.action ?? "overview",
      alertCount: overview.alerts.length,
    };

    for (const r of overview.resources) {
      const key = r.type.toLowerCase();
      priceParams[`price_${key}`] = r.currentPrice;
      priceParams[`change_${key}`] = r.changePercent;
      priceParams[`trend_${key}`] = r.trend;
    }

    return buildFrameResponse({
      screen: "market",
      fid: this.player.fid,
      imageParams: priceParams,
    });
  }

  /** Build a Frame response for a trade result (success or failure). */
  buildTradeResultScreen(result: TradeResult): FrameResponse {
    if (result.success) {
      return buildFrameResponse({
        screen: "result",
        fid: this.player.fid,
        imageParams: {
          success: 1,
          tradeResult: 1,
          side: result.side,
          resource: result.resource,
          quantity: result.filledQuantity,
          avgPrice: result.avgPrice,
          totalCost: result.totalCost,
          slippage: result.slippage,
          balance: Math.floor(this.player.state.lunarBalance),
        },
        buttons: [
          { label: "📈 Market", action: "post" },
          { label: "🏠 Home", action: "post" },
        ],
      });
    }

    return buildFrameResponse({
      screen: "result",
      fid: this.player.fid,
      imageParams: {
        success: 0,
        tradeResult: 1,
        side: result.side,
        resource: result.resource,
        error: result.error ?? "Trade failed",
      },
      buttons: [
        { label: "📈 Try Again", action: "post" },
        { label: "🏠 Home", action: "post" },
      ],
    });
  }

  allianceScreen(extra?: { tab?: string }): FrameResponse {
    return buildFrameResponse({
      screen: "alliance",
      fid: this.player.fid,
      imageParams: {
        balance: Math.floor(this.player.state.lunarBalance),
        tab: extra?.tab ?? "overview",
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Condense module list into type→count map for image rendering. */
function summarizeModules(
  modules: ModuleState[],
): Record<string, string | number> {
  const counts: Record<string, number> = {};
  for (const m of modules) {
    counts[m.type] = (counts[m.type] ?? 0) + 1;
  }

  const result: Record<string, string | number> = {};
  for (const [type, count] of Object.entries(counts)) {
    result[`mod_${type.toLowerCase()}`] = count;
  }
  return result;
}
