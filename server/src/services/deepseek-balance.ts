const DEEPSEEK_API_BASE = "https://api.deepseek.com";

export interface DeepSeekBalanceInfo {
  isAvailable: boolean;
  currency: string;
  totalBalance: string;
  grantedBalance: string;
  toppedUpBalance: string;
}

export async function fetchDeepSeekBalance(apiKey: string): Promise<DeepSeekBalanceInfo | null> {
  if (!apiKey) return null;

  try {
    const res = await fetch(`${DEEPSEEK_API_BASE}/user/balance`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      console.warn(`[DeepSeek Balance] API returned ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      is_available: boolean;
      balance_infos: { currency: string; total_balance: string; granted_balance: string; topped_up_balance: string }[];
    };

    const info = data.balance_infos?.[0];
    if (!info) return null;

    return {
      isAvailable: data.is_available,
      currency: info.currency,
      totalBalance: info.total_balance,
      grantedBalance: info.granted_balance,
      toppedUpBalance: info.topped_up_balance,
    };
  } catch (err) {
    console.warn("[DeepSeek Balance] Fetch failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
