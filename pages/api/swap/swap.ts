import {Connection, Keypair, PublicKey} from "@solana/web3.js";
import {BN, Wallet} from "@coral-xyz/anchor";
import {base58} from "@scure/base";
import {
  buildWhirlpoolClient, MAX_SQRT_PRICE, MIN_SQRT_PRICE,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  TickUtil, toTx,
  WhirlpoolContext, WhirlpoolIx
} from "@orca-so/whirlpools-sdk";
import {DecimalUtil} from "@orca-so/sdk";
import Decimal from "decimal.js";

const RPC = 'https://nd-577-894-121.p2pify.com/c85dcdad6bb41b45e3da34b715ef5146'
const WS_ENDPOINT = 'wss://ws-nd-577-894-121.p2pify.com/c85dcdad6bb41b45e3da34b715ef5146'
type SwapParams = {
  pool: string;
  amount: number;
  amountDecimal: number;
  secretKey: string;
  tokenOwnerAccountA: string;
  tokenOwnerAccountB: string;
  aToB: boolean
}
const swap = async ({pool, amount, amountDecimal, secretKey, tokenOwnerAccountA, tokenOwnerAccountB, aToB}: SwapParams) => {
  const connection = new Connection(
    RPC,
    {
      wsEndpoint: WS_ENDPOINT
    },
  );
  const wallet = new Wallet(
    Keypair.fromSecretKey(base58.decode(secretKey)),
  );
  const ctx = WhirlpoolContext.from(
    connection,
    wallet,
    ORCA_WHIRLPOOL_PROGRAM_ID,
  );

  const whirlpoolClient = buildWhirlpoolClient(ctx);
  const whirlpool = await whirlpoolClient.getPool(pool);
  const whirlpoolData = await whirlpool.getData();

  const amountIn = DecimalUtil.toU64(
    new Decimal(amount),
    amountDecimal,
  );
  const startTick = TickUtil.getStartTickIndex(
    whirlpoolData.tickCurrentIndex,
    whirlpoolData.tickSpacing,
  );
  const tickArrayKey = PDAUtil.getTickArray(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    whirlpool.getAddress(),
    startTick,
  );

  const oraclePda = PDAUtil.getOracle(
    ctx.program.programId,
    whirlpool.getAddress(),
  );
  const tx = toTx(
    ctx,
    WhirlpoolIx.swapIx(ctx.program, {
      whirlpool: whirlpool.getAddress(),
      tokenAuthority: ctx.wallet.publicKey,
      tokenOwnerAccountA: new PublicKey(
        tokenOwnerAccountA,
      ),
      tokenVaultA: whirlpool.getTokenVaultAInfo().address,
      tokenOwnerAccountB: new PublicKey(
        tokenOwnerAccountB,
      ),
      tokenVaultB: whirlpool.getTokenVaultBInfo().address,
      oracle: oraclePda.publicKey,
      amount: amountIn,
      otherAmountThreshold: new BN(0),
      sqrtPriceLimit: new BN(aToB ? MIN_SQRT_PRICE: MAX_SQRT_PRICE),
      amountSpecifiedIsInput: true,
      aToB,
      tickArray0: tickArrayKey.publicKey,
      tickArray1: tickArrayKey.publicKey,
      tickArray2: tickArrayKey.publicKey,
    }),
  );

  const txId = await tx.buildAndExecute();

  return {
    txId,
  };
}

export default swap
