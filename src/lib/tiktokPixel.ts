/**
 * TikTok Pixel (DC3J0CBC77U6OQMIKJ80) Client-Side Advanced Matching & Event Helper
 *
 * Implements SHA-256 client-side PII hashing before `ttq.identify(...)`
 * and strongly-typed dispatchers for all 9 TikTok standard ecommerce events:
 *   ViewContent, AddToWishlist, Search, AddPaymentInfo, AddToCart,
 *   InitiateCheckout, PlaceAnOrder, CompleteRegistration, Purchase
 */

export const TIKTOK_PIXEL_ID = 'DC3J0CBC77U6OQMIKJ80';

export type TikTokEventName =
  | 'ViewContent'
  | 'AddToWishlist'
  | 'Search'
  | 'AddPaymentInfo'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'PlaceAnOrder'
  | 'CompleteRegistration'
  | 'Purchase';

export interface TikTokContentItem {
  content_id: string;
  content_type: 'product' | 'product_group';
  content_name: string;
}

export interface TikTokEventPayload {
  contents: TikTokContentItem[];
  value: number;
  currency?: string;
  search_string?: string;
}

export interface TikTokIdentifyInput {
  email?: string;
  phone?: string;
  externalId?: string;
}

interface TikTokQueue {
  page: () => void;
  identify: (data: Record<string, string>) => void;
  track: (event: string, payload: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    ttq?: TikTokQueue;
    pbTikTok?: {
      pixelId: string;
      identify: (input: TikTokIdentifyInput) => Promise<boolean>;
      track: (event: TikTokEventName, payload: TikTokEventPayload, pii?: TikTokIdentifyInput) => Promise<boolean>;
      page: () => void;
    };
  }
}

export async function sha256HexClient(value: string): Promise<string> {
  const normalized = value.trim();
  if (!normalized || typeof crypto === 'undefined' || !crypto.subtle) return '';
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalizePhoneForTikTok(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return '';
  const digits = cleaned.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : digits ? `+${digits}` : '';
}

/**
 * Hashes customer PII with SHA-256 on the client side before calling ttq.identify.
 */
export async function identifyTikTokUser(input: TikTokIdentifyInput): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ttq) return false;
  const payload: Record<string, string> = {};

  if (input.email?.trim()) {
    const hashed = await sha256HexClient(input.email.trim().toLowerCase());
    if (hashed) payload.email = hashed;
  }
  if (input.phone?.trim()) {
    const normalizedPhone = normalizePhoneForTikTok(input.phone);
    const hashed = normalizedPhone ? await sha256HexClient(normalizedPhone) : '';
    if (hashed) payload.phone_number = hashed;
  }
  if (input.externalId?.trim()) {
    const hashed = await sha256HexClient(input.externalId.trim());
    if (hashed) payload.external_id = hashed;
  }

  if (Object.keys(payload).length === 0) return false;
  window.ttq.identify(payload);
  return true;
}

export function trackTikTokPageView(): void {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.page();
  }
}

/**
 * Fires a TikTok standard ecommerce event, optionally identifying the user
 * with SHA-256 hashed PII immediately beforehand.
 */
export async function trackTikTokEvent(
  eventName: TikTokEventName,
  payload: TikTokEventPayload,
  pii?: TikTokIdentifyInput,
): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ttq) return false;

  if (pii) {
    await identifyTikTokUser(pii);
  }

  const eventBody: Record<string, unknown> = {
    contents: payload.contents.map((item) => ({
      content_id: String(item.content_id || 'playbeat_item'),
      content_type: item.content_type || 'product',
      content_name: String(item.content_name || 'PlayBeat Digital Product'),
    })),
    value: Number(payload.value) || 0,
    currency: (payload.currency || 'USD').toUpperCase(),
  };

  if (eventName === 'Search' && payload.search_string !== undefined) {
    eventBody.search_string = String(payload.search_string);
  }

  window.ttq.track(eventName, eventBody);
  return true;
}

// Expose helper on window for storefront / browser console diagnostics
if (typeof window !== 'undefined') {
  window.pbTikTok = {
    pixelId: TIKTOK_PIXEL_ID,
    identify: identifyTikTokUser,
    track: trackTikTokEvent,
    page: trackTikTokPageView,
  };
}

export const TIKTOK_STOREFRONT_EVENTS_SNIPPET = `<!-- TikTok Pixel (${TIKTOK_PIXEL_ID}) + SHA-256 Identify & 9 Standard Events -->
<script>
(function(){
  async function sha256(str){
    if(!str || !crypto.subtle) return '';
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str.trim()));
    return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
  }
  window.pbTikTokIdentify = async function(opts){
    if(!window.ttq || !opts) return;
    var p = {};
    if(opts.email) p.email = await sha256(opts.email.toLowerCase());
    if(opts.phone) p.phone_number = await sha256(opts.phone.replace(/[^\\d+]/g,''));
    if(opts.externalId) p.external_id = await sha256(String(opts.externalId));
    if(Object.keys(p).length) window.ttq.identify(p);
  };
  window.pbTikTokTrack = async function(eventName, data, pii){
    if(!window.ttq) return;
    if(pii) await window.pbTikTokIdentify(pii);
    window.ttq.track(eventName, Object.assign({ currency: 'USD', value: 0, contents: [] }, data || {}));
  };
})();
</script>`;
