import type { NextApiRequest, NextApiResponse } from 'next'
import swap from "@/pages/api/swap/swap";

// Pool (LMF/USDC)
const POOL = '8Mt3QbGAn7x3BowDrDiFmXJbsmzY8mpQ5jNw8BqX5GWc'

const MIN_USDC = 40
const MAX_USDC = 60
const MAX_RETRY = 5;

const KEY_WALLET_POOL  = [
  {
    // Wallet address: 3NqrEuoGjdQYaGyVvsT9hJFXToRyBKbqBgAWM4Gsfx28
    // Link to get tokenOwnerAccount: https://solscan.io/account/3NqrEuoGjdQYaGyVvsT9hJFXToRyBKbqBgAWM4Gsfx28#portfolio
    key: '', // private key
    tokenOwnerAccountA: 'AMLJazAD8dtpXnADvB7Dz4SW84QzxEDsWmw1erJRZZVK',
    tokenOwnerAccountB: 'GaMGG3QtWLf5RB3MM5fVzmT9z3yPKLYSD1bvRaJwKDzk',
  },
];

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  let retry = 0;
  const isBuy = random(0, 1);
  if (isBuy) {
    const amount = random(MIN_USDC, MAX_USDC)
    do {
      try {
        const walletIndex = random(0, KEY_WALLET_POOL.length - 1);
        const data = await swap({
          pool: POOL, // pool address (LMF/USDC)
          amount, // USDC amount
          amountDecimal: 6, // Decimal of USDC
          tokenOwnerAccountB: KEY_WALLET_POOL[walletIndex].tokenOwnerAccountB, // Token owner of USDC
          tokenOwnerAccountA: KEY_WALLET_POOL[walletIndex].tokenOwnerAccountA, // Token owner of LMF
          aToB: false, // B => A
          secretKey: KEY_WALLET_POOL[walletIndex].key,
        });
        console.log(`[Buy-LMF] [Wallet: ${walletIndex}] [Amount: ${amount}]`);
        res.status(200).json(data)
        break;
      } catch (e: any) {
        console.log('[Buy error]: ', e.message);
        retry++;
        if (retry === MAX_RETRY) res.status(500).json({ error: e.message })
      }
    } while (retry < MAX_RETRY);
  } else {
    const price = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?ids=lamas-finance&vs_currency=usd&x_cg_demo_api_key=CG-uqYgjYXYnJRfH9DJxcFuqyfd',
    )
      .then((res) => res.ok && res.json())
      .then((list) => list?.[0]?.current_price || 0.15)
      .catch((e) => {
        console.log('Fetch failed:', e);
        return 0.15;
      });
    const amount = random(MIN_USDC, MAX_USDC)
    do {
      try {
        const walletIndex = random(0, KEY_WALLET_POOL.length - 1);
        const data = await swap({
          pool: POOL,
          amount: amount / price, // LMF amount
          amountDecimal: 9, // Decimal of LMF
          tokenOwnerAccountA: KEY_WALLET_POOL[walletIndex].tokenOwnerAccountA, // Token owner of LMF
          tokenOwnerAccountB: KEY_WALLET_POOL[walletIndex].tokenOwnerAccountB, // Token owner of USDC
          aToB: true, // A => B
          secretKey: KEY_WALLET_POOL[walletIndex].key,
        });
        console.log(`[Sell-LMF] [Wallet: ${walletIndex}] [Amount: ${amount}] [Price: ${price}]`);
        res.status(200).json(data)
        break;
      } catch (e: any) {
        console.log('[Sell error]: ', e.message);
        retry++;
        if (retry === MAX_RETRY) {
          res.status(500).json({ error: e.message })
        }
      }
    } while (retry < MAX_RETRY);
  }
}
