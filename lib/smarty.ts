import axios from "axios";

const smartyAuthId = process.env.SMARTYSTREETS_AUTH_ID;
const smartyAuthToken = process.env.SMARTYSTREETS_AUTH_TOKEN;

if ((!smartyAuthId || !smartyAuthToken) && process.env.NODE_ENV === "development") {
  // eslint-disable-next-line no-console
  console.warn(
    "SmartyStreets credentials are not set. Address validation will be skipped in development.",
  );
}

export type AddressInput = {
  street: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
};

export type ValidatedAddress = {
  street: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
};

export async function validateAddress(
  address: AddressInput,
): Promise<ValidatedAddress | null> {
  if (!smartyAuthId || !smartyAuthToken) {
    return null;
  }

  try {
    const response = await axios.get(
      "https://us-street.api.smartystreets.com/street-address",
      {
        params: {
          "auth-id": smartyAuthId,
          "auth-token": smartyAuthToken,
          street: address.street,
          city: address.city,
          state: address.state,
          zipcode: address.zipcode,
        },
      },
    );

    const candidates = response.data as any[];
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return null;
    }

    const first = candidates[0];
    return {
      street: `${first.delivery_line_1}`,
      city: first.components.city_name,
      state: first.components.state_abbreviation,
      zipcode: `${first.components.zipcode}-${first.components.plus4_code}`,
      country: "US",
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("SmartyStreets validation error:", error);
    }
    return null;
  }
}



