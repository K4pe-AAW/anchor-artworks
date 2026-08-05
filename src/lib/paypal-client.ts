export function isPaypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function apiBase(): string {
  return process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPalの認証情報が設定されていません");
  }
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`PayPal認証に失敗しました（status ${res.status}）`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("PayPalアクセストークンの取得に失敗しました");
  }
  return data.access_token;
}

export interface PaypalTransaction {
  transaction_info: {
    transaction_id: string;
    transaction_initiation_date?: string;
    transaction_amount?: { value: string; currency_code: string };
    fee_amount?: { value: string };
    transaction_status?: string;
  };
  payer_info?: {
    email_address?: string;
  };
}

/** 直近の取引を読み取り専用で取得する（PayPal Reporting API）。 */
export async function fetchPaypalTransactions(
  startDate: Date,
  endDate: Date,
): Promise<PaypalTransaction[]> {
  const accessToken = await getAccessToken();
  const params = new URLSearchParams({
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    fields: "all",
    page_size: "100",
  });
  const res = await fetch(`${apiBase()}/v1/reporting/transactions?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`PayPal取引の取得に失敗しました（status ${res.status}）`);
  }
  const data = (await res.json()) as { transaction_details?: PaypalTransaction[] };
  return data.transaction_details ?? [];
}
