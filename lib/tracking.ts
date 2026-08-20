/**
 * Builds a real carrier tracking URL for common carriers. Falls back to a
 * Google search for unknown carriers so the link is never a dead "#".
 */
export function carrierTrackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined,
): string | null {
  if (!trackingNumber) return null;

  const n = encodeURIComponent(trackingNumber.trim());
  const key = (carrier ?? "").trim().toLowerCase();

  if (key.includes("ups")) return `https://www.ups.com/track?tracknum=${n}`;
  if (key.includes("usps"))
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (key.includes("fedex"))
    return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  if (key.includes("dhl"))
    return `https://www.dhl.com/en/express/tracking.html?AWB=${n}`;

  // Unknown carrier — a search is more useful than a dead link.
  return `https://www.google.com/search?q=${encodeURIComponent(
    `${carrier ?? ""} tracking ${trackingNumber}`.trim(),
  )}`;
}
