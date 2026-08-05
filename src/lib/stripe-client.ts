import Stripe from "stripe";

let cachedClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * 現時点ではサービスごとに個別のキーを保存する仕組みは未実装のため、
 * 環境変数1組（STRIPE_SECRET_KEY）を全サービス共通で使う簡易実装。
 * 監視対象サービスが増えた際は、サービス単位で暗号化保存する設計に拡張すること。
 */
export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cachedClient) {
    cachedClient = new Stripe(key);
  }
  return cachedClient;
}
