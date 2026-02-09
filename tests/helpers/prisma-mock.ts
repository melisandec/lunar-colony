/**
 * Prisma Client mock for unit tests.
 *
 * Provides a fully mocked PrismaClient that returns empty/default
 * values for all operations. Individual tests override specific
 * methods as needed.
 *
 * Usage in tests:
 *   import { prismaMock, resetPrismaMock } from "../helpers/prisma-mock";
 *   beforeEach(() => resetPrismaMock());
 */

type MockFn = jest.Mock<Promise<unknown>, unknown[]>;

function mockReturning(val: unknown): MockFn {
  return jest.fn().mockResolvedValue(val);
}

/** Creates a mock model with standard Prisma operations. */
function createMockModel() {
  return {
    findUnique: mockReturning(null),
    findUniqueOrThrow: mockReturning({ id: "mock_id" }),
    findFirst: mockReturning(null),
    findMany: mockReturning([]),
    create: mockReturning({ id: "mock_id" }),
    createMany: mockReturning({ count: 0 }),
    update: mockReturning({ id: "mock_id" }),
    updateMany: mockReturning({ count: 0 }),
    upsert: mockReturning({ id: "mock_id" }),
    delete: mockReturning({ id: "mock_id" }),
    deleteMany: mockReturning({ count: 0 }),
    count: mockReturning(0),
    aggregate: mockReturning({}),
    groupBy: mockReturning([]),
  };
}

export const prismaMock = {
  player: createMockModel(),
  module: createMockModel(),
  crewMember: createMockModel(),
  playerResource: createMockModel(),
  resourcePrice: createMockModel(),
  priceHistory: createMockModel(),
  priceAlert: createMockModel(),
  transaction: createMockModel(),
  achievement: createMockModel(),
  playerAchievement: createMockModel(),
  alliance: createMockModel(),
  allianceMember: createMockModel(),
  productionLog: createMockModel(),
  activeEvent: createMockModel(),
  eventParticipant: createMockModel(),
  eventReward: createMockModel(),
  gameEvent: createMockModel(),
  leaderboardSnapshot: createMockModel(),
  gameConfig: createMockModel(),
  moduleBlueprint: createMockModel(),
  playerSummary: createMockModel(),
  $queryRaw: mockReturning([]),
  $transaction: jest.fn().mockImplementation(async (fnOrArray: unknown) => {
    if (Array.isArray(fnOrArray)) {
      return Promise.all(fnOrArray);
    }
    if (typeof fnOrArray === "function") {
      return (fnOrArray as (tx: typeof prismaMock) => Promise<unknown>)(
        prismaMock,
      );
    }
    return fnOrArray;
  }),
};

/** Reset all mock implementations to defaults. */
export function resetPrismaMock(): void {
  for (const [key, value] of Object.entries(prismaMock)) {
    if (key.startsWith("$")) {
      if (key === "$queryRaw") {
        (value as MockFn).mockResolvedValue([]);
      }
    } else if (typeof value === "object" && value !== null) {
      for (const fn of Object.values(value as Record<string, MockFn>)) {
        if (typeof fn?.mockReset === "function") {
          fn.mockReset();
          fn.mockResolvedValue(null);
        }
      }
    }
  }
}

// Auto-mock the database module
jest.mock("@/lib/database", () => ({
  __esModule: true,
  default: prismaMock,
  prisma: prismaMock,
  readPrisma: prismaMock,
}));
