/**
 * Utils — Unit Tests
 *
 * Tests for formatting helpers, URL builders, and time utilities.
 */

const {
  absoluteUrl,
  frameMetaTags,
  frameHtmlResponse,
  formatNumber,
  formatLunar,
  secondsUntilNextTick,
  GAME_CONSTANTS,
} =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/lib/utils") as typeof import("@/lib/utils");

// =========================================================================
// absoluteUrl
// =========================================================================

describe("absoluteUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("prepends base URL to path", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://lunar.example.com";
    const url = absoluteUrl("/api/health");
    expect(url).toMatch(/\/api\/health$/);
  });

  test("adds leading slash if missing", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://lunar.example.com";
    const url = absoluteUrl("dashboard");
    expect(url).toContain("/dashboard");
  });

  test("uses VERCEL_URL when NEXT_PUBLIC_APP_URL is not set", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_URL = "my-app.vercel.app";
    const url = absoluteUrl("/test");
    expect(url).toContain("my-app.vercel.app");
    expect(url).toMatch(/\/test$/);
  });

  test("falls back to localhost", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    const url = absoluteUrl("/test");
    expect(url).toMatch(/localhost:3000\/test$/);
  });
});

// =========================================================================
// formatNumber
// =========================================================================

describe("formatNumber", () => {
  test("formats numbers below 1000", () => {
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(0)).toBe("0");
  });

  test("formats thousands", () => {
    expect(formatNumber(1000)).toBe("1.0K");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(999999)).toBe("1000.0K");
  });

  test("formats millions", () => {
    expect(formatNumber(1_000_000)).toBe("1.0M");
    expect(formatNumber(2_500_000)).toBe("2.5M");
  });
});

// =========================================================================
// formatLunar
// =========================================================================

describe("formatLunar", () => {
  test("appends $LUNAR suffix", () => {
    expect(formatLunar(500)).toBe("500 $LUNAR");
    expect(formatLunar(1500)).toBe("1.5K $LUNAR");
    expect(formatLunar(2_500_000)).toBe("2.5M $LUNAR");
  });
});

// =========================================================================
// secondsUntilNextTick
// =========================================================================

describe("secondsUntilNextTick", () => {
  test("returns a positive number", () => {
    const s = secondsUntilNextTick();
    expect(s).toBeGreaterThan(0);
  });

  test("returns value within tick interval", () => {
    const maxSeconds = GAME_CONSTANTS.TICK_INTERVAL_MS / 1000;
    const s = secondsUntilNextTick();
    expect(s).toBeLessThanOrEqual(maxSeconds);
  });
});

// =========================================================================
// frameMetaTags
// =========================================================================

describe("frameMetaTags", () => {
  test("generates basic meta tags", () => {
    const tags = frameMetaTags({
      imageUrl: "https://example.com/img.png",
      postUrl: "https://example.com/post",
    });

    expect(tags).toContain('fc:frame" content="vNext"');
    expect(tags).toContain(
      'fc:frame:image" content="https://example.com/img.png"',
    );
    expect(tags).toContain(
      'fc:frame:post_url" content="https://example.com/post"',
    );
  });

  test("includes buttons", () => {
    const tags = frameMetaTags({
      imageUrl: "https://example.com/img.png",
      postUrl: "https://example.com/post",
      buttons: [
        { label: "Build", action: "post" },
        { label: "Visit", action: "link", target: "https://example.com" },
      ],
    });

    expect(tags).toContain('fc:frame:button:1" content="Build"');
    expect(tags).toContain('fc:frame:button:1:action" content="post"');
    expect(tags).toContain('fc:frame:button:2" content="Visit"');
    expect(tags).toContain('fc:frame:button:2:action" content="link"');
    expect(tags).toContain(
      'fc:frame:button:2:target" content="https://example.com"',
    );
  });

  test("includes input text", () => {
    const tags = frameMetaTags({
      imageUrl: "https://example.com/img.png",
      postUrl: "https://example.com/post",
      inputText: "Enter amount",
    });

    expect(tags).toContain('fc:frame:input:text" content="Enter amount"');
  });
});

// =========================================================================
// frameHtmlResponse
// =========================================================================

describe("frameHtmlResponse", () => {
  test("returns valid HTML with meta tags", () => {
    const html = frameHtmlResponse({
      imageUrl: "https://example.com/img.png",
      postUrl: "https://example.com/post",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html>");
    expect(html).toContain("fc:frame");
    expect(html).toContain("Lunar Colony Tycoon");
  });
});
