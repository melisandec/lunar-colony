import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

/**
 * Base blockchain client (read-only for now).
 *
 * Using the free public RPC endpoint.
 * All blockchain interactions are MOCKED initially -
 * this client is set up for when we integrate real on-chain features.
 */

export const baseClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
});

// --- Mock Token Functions ---
// These simulate blockchain interactions for $LUNAR token.
// Will be replaced with real contract calls later.

/**
 * Get mock $LUNAR balance for a player.
 * In production, this would read from a smart contract.
 */
export async function getLunarBalance(_walletAddress: string): Promise<bigint> {
  // TODO: Replace with actual contract read
  // return baseClient.readContract({
  //   address: LUNAR_TOKEN_ADDRESS,
  //   abi: LUNAR_TOKEN_ABI,
  //   functionName: 'balanceOf',
  //   args: [walletAddress],
  // });

  // Mock: return 0 - actual balance tracked in database
  return BigInt(0);
}

/**
 * Mock transfer of $LUNAR tokens.
 * In production, this would submit an on-chain transaction.
 */
export async function transferLunar(
  _from: string,
  _to: string,
  _amount: bigint,
): Promise<{ hash: string; success: boolean }> {
  // TODO: Replace with actual contract write
  return {
    hash: `0x${"0".repeat(64)}`, // mock tx hash
    success: true,
  };
}

export const blockchain = {
  client: baseClient,
  getLunarBalance,
  transferLunar,
};

export default blockchain;
