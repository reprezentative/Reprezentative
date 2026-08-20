import axios from "axios";

const taxjarApiKey = process.env.TAXJAR_API_KEY;

if (!taxjarApiKey && process.env.NODE_ENV === "development") {
  // eslint-disable-next-line no-console
  console.warn(
    "TAXJAR_API_KEY is not set. Tax calculations will be skipped in development.",
  );
}

const TAXJAR_BASE_URL = "https://api.taxjar.com/v2";

export type TaxJarAddress = {
  to_country: string;
  to_zip: string;
  to_state?: string;
  to_city?: string;
  to_street?: string;
};

export type TaxJarLineItem = {
  id: string;
  quantity: number;
  unit_price: number;
};

export type TaxCalculationResult = {
  amountToCollect: number;
  rate: number;
};

export async function calculateTax(
  address: TaxJarAddress,
  lineItems: TaxJarLineItem[],
  shipping: number,
): Promise<TaxCalculationResult | null> {
  if (!taxjarApiKey) {
    return null;
  }

  try {
    const response = await axios.post(
      `${TAXJAR_BASE_URL}/taxes`,
      {
        to_country: address.to_country,
        to_zip: address.to_zip,
        to_state: address.to_state,
        to_city: address.to_city,
        to_street: address.to_street,
        shipping,
        line_items: lineItems,
      },
      {
        headers: {
          Authorization: `Bearer ${taxjarApiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const tax = response.data.tax;
    return {
      amountToCollect: tax.amount_to_collect ?? 0,
      rate: tax.rate ?? 0,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("TaxJar calculation error:", error);
    }
    return null;
  }
}



