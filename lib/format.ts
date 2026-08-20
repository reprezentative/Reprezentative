export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US");
}

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = "USD",
): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}



