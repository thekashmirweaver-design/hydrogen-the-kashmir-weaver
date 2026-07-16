/** Kashmir Weaver policy HTML — source of truth for Shopify seed scripts. */

import {CONTACT, phoneDigits} from '../../app/lib/contact.ts';

const EMAIL = CONTACT.email;
const PHONE = CONTACT.phone;
const TEL_HREF = `tel:+${phoneDigits(CONTACT.phone)}`;
/** Primary storefront host — keep in sync with PUBLIC_STORE_URL / docs/seo-and-domains.md */
const SITE =
  (typeof process !== 'undefined' &&
    process.env.PUBLIC_STORE_URL?.replace(/^https?:\/\//, '').replace(/\/$/, '')) ||
  'thekashmirweaver.shop';
const RETURNS_ADDRESS =
  'H 10-A, Firdousa Abad, Batamaloo, Srinagar, Jammu and Kashmir 190009, India';

export const SHIPPING_POLICY_HTML = `
<p class="policy-lead">Every piece leaves our Srinagar atelier fully insured and tracked. This policy describes how we deliver hand-woven pashmina worldwide.</p>

<h2>Order processing</h2>
<p>In-stock pieces are prepared for dispatch within 2–4 business days of order confirmation. During peak seasons or for bespoke commissions, processing times may vary — our Concierge will advise you before dispatch.</p>

<h2>Delivery within India</h2>
<p>Domestic delivery within India is complimentary on all retail orders placed through ${SITE}. Orders are sent via insured courier and require a signature on receipt. Please allow 5–7 working days from dispatch. Bank holidays are not considered working days.</p>
<ul>
  <li>Tracking details are sent by email and SMS once your order ships.</li>
  <li>If you or someone on your behalf cannot sign for delivery, the carrier will leave a card to arrange redelivery.</li>
</ul>

<h2>International delivery</h2>
<p>We ship worldwide via insured courier. International delivery typically takes 7–12 working days from dispatch, depending on destination and customs clearance. <strong>Free worldwide shipping applies to retail orders over $200</strong> placed through this site (wholesale orders excluded).</p>
<p>Shipping fees for orders below the free-shipping threshold are calculated at checkout based on destination and weight. All international deliveries require a signature to accept.</p>

<h2>Customs, duties and taxes</h2>
<p>When ordering from outside India, you may be subject to import duties and local taxes levied once the package reaches your country. These charges are your responsibility; we cannot predict or control them. You are considered the importer of record and must comply with all laws of the country in which you receive the goods.</p>

<h2>Tracking and insurance</h2>
<p>Every order ships fully insured. You will receive tracking information by email once your parcel leaves our atelier. For any concern in transit, contact our Concierge — we will personally follow your piece from Srinagar to your hands.</p>

<h2>Failed or refused delivery</h2>
<p>We cannot redirect orders once dispatched. If delivery proves impossible or impractical on two or more occasions, we may cancel the order and deduct original delivery charges from any refund. We will notify you so you may place a new order if required.</p>
<p>We are unable to deliver to PO Box addresses in certain regions. Please contact Concierge before ordering if your address may be affected.</p>

<h2>Order cancellation by the customer</h2>
<p>To cancel before dispatch, see our <a href="/cancellation">Cancellation Policy</a>. Approved cancellations are refunded <strong>minus payment gateway fees</strong>.</p>

<h2>Contact</h2>
<p>For delivery enquiries: <a href="mailto:${EMAIL}">${EMAIL}</a> · <a href="${TEL_HREF}">${PHONE}</a> · <a href="/concierge">Concierge</a></p>
`.trim();

export const REFUND_POLICY_HTML = `
<p class="policy-lead">We want you to be delighted with every piece from The Kashmir Weaver. This policy explains returns, exchanges, and refunds for orders placed through ${SITE}.</p>

<h2>Returns window</h2>
<p>Ready-to-wear pieces may be returned within <strong>14 days of delivery</strong> for a full refund, provided they are unworn, in perfect saleable condition, and in their original packaging with proof of purchase.</p>

<h2>How to return</h2>
<p>Please contact our Concierge before returning any item — we will guide you through the process.</p>
<p>Send returns to:</p>
<p><strong>The Kashmir Weaver — Returns</strong><br>${RETURNS_ADDRESS}</p>
<p>The cost of returning goods and their safe transit is your responsibility until we receive them at our returns address. We recommend a tracked or recorded delivery service; for high-value pieces, please insure the shipment.</p>

<h2>Refunds</h2>
<p>Approved returns are refunded to the original payment method once processed at our atelier. Please allow up to 10–15 business days from receipt of the returned item for the refund to appear on your statement. Original delivery charges are non-refundable unless the return is due to our error.</p>

<h2>Exchanges</h2>
<p>Ready-to-wear pieces in original condition may be exchanged within 14 days of delivery, subject to availability. Contact Concierge to arrange an exchange.</p>

<h2>Bespoke and made-to-order pieces</h2>
<p>Custom, bespoke, and made-to-order commissions are crafted uniquely for you and are <strong>final sale</strong>. They cannot be returned or exchanged unless defective or materially different from the agreed specification.</p>

<h2>Solid Pashmina (Solids category)</h2>
<p>Pieces from the <strong>Solids</strong> category are dyed to your selected colour after the order is placed. Because each solid is processed to order, Solids are <strong>final sale</strong> and are excluded from returns and exchanges, unless the material is defective.</p>

<h2>Sale and promotional items</h2>
<p>Items purchased during a sale or promotional event may be returned for exchange or store credit only if returned in original condition with proof of purchase, during the same sale period or within 14 days of purchase (whichever is earlier). Items reduced to 50% or below the original retail price cannot be returned. This does not affect your statutory rights.</p>

<h2>Damaged or incorrect items</h2>
<p>If your piece arrives damaged or materially different from its description, contact Concierge within 48 hours of delivery with your order number and photographs. Do not accept a visibly damaged package — contact us immediately. We will arrange collection and a replacement or full refund at our cost.</p>

<h2>Order cancellation</h2>
<p>You may cancel an order within 24 hours of payment confirmation, provided it has not yet been dispatched. Approved cancellations are refunded to the original payment method <strong>minus payment gateway fees</strong> (non-refundable). After 24 hours, or once a bespoke piece has entered production, cancellation may no longer be possible. Email <a href="mailto:${EMAIL}">${EMAIL}</a> or call ${PHONE} with your order number. Full details: <a href="/cancellation">Cancellation Policy</a>.</p>
<p>If your order has already shipped, please follow the return instructions above once received.</p>

<h2>Contact</h2>
<p><a href="mailto:${EMAIL}">${EMAIL}</a> · <a href="${TEL_HREF}">${PHONE}</a> · <a href="/concierge">Concierge</a></p>
`.trim();

export const CANCELLATION_POLICY_HTML = `
<p class="policy-lead">This policy explains how to cancel an order placed through ${SITE} before or after dispatch.</p>

<h2>Cancel within 24 hours</h2>
<p>You may cancel an order within <strong>24 hours of payment confirmation</strong>, provided the order has not yet been dispatched. Approved cancellations are refunded to the original payment method, <strong>minus payment gateway fees</strong> charged on the original transaction (these fees are non-refundable).</p>

<h2>After 24 hours or once in production</h2>
<p>After 24 hours, or once a bespoke or made-to-order piece has entered production, cancellation may no longer be possible. Solids dyed to order follow the same rule once colour processing has begun. Where we can still cancel, the refund is the order amount <strong>minus payment gateway fees</strong>.</p>

<h2>If your order has already shipped</h2>
<p>Once dispatched, please follow our <a href="/returns">Returns Policy</a> after delivery. Contact Concierge before refusing delivery so we can guide you.</p>

<h2>How to request cancellation</h2>
<p>Email <a href="mailto:${EMAIL}">${EMAIL}</a> or call <a href="${TEL_HREF}">${PHONE}</a> with your order number. We aim to confirm within one business day during our support hours (Monday–Saturday, 10:00–18:00 IST).</p>

<h2>Contact</h2>
<p><a href="mailto:${EMAIL}">${EMAIL}</a> · <a href="${TEL_HREF}">${PHONE}</a> · <a href="/concierge">Concierge</a></p>
`.trim();

export const TERMS_OF_SERVICE_HTML = `
<p class="policy-lead">These terms govern your use of ${SITE} and the purchase of hand-woven pashmina from The Kashmir Weaver. By accessing this site or placing an order, you accept these terms in full.</p>

<h2>1. General</h2>
<p>The Kashmir Weaver operates this website to offer authentic, hand-woven Kashmiri pashmina. All content is for general information only and does not constitute advice. Product descriptions, imagery, and specifications are fairly accurate; slight variations in colour, weave, and finish are inherent to hand craftsmanship and do not constitute defects.</p>

<h2>2. Orders and acceptance</h2>
<p>Products displayed on ${SITE} constitute an invitation to offer. Your order is an offer subject to these terms. We reserve the right to accept or decline any order. Acceptance occurs upon dispatch of the product(s). We will confirm receipt and dispatch by email where a valid address is provided.</p>

<h2>3. Accounts</h2>
<p>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Provide true, accurate, and current information. We may suspend accounts if we suspect breach of security or misuse of the site.</p>

<h2>4. Pricing and payment</h2>
<p>Prices are shown in the currency displayed at checkout and may change without notice. We cannot confirm a price until after you order. If a product is listed at an incorrect price, we may refuse or cancel the order unless already dispatched. Payment is processed securely through Shopify; we do not store full card numbers. You agree to provide lawful payment details and accept responsibility for fraudulent use of cards not lawfully owned by you.</p>

<h2>5. Delivery</h2>
<p>Delivery times are estimates, not guarantees. Delayed or early delivery does not entitle you to damages. We deliver to the address on your order; you are responsible for its accuracy. See our <a href="/shipping">Shipping Policy</a> for full details.</p>

<h2>6. Returns</h2>
<p>Returns are governed by our <a href="/returns">Returns Policy</a>. Statutory rights are unaffected.</p>

<h2>7. Cancellation</h2>
<p>You may cancel an order within 24 hours of payment confirmation if it has not yet been dispatched. Approved cancellation refunds are paid to the original payment method <strong>minus payment gateway fees</strong> (non-refundable). After that window, or once a bespoke piece has entered production, cancellation may no longer be possible. See our <a href="/cancellation">Cancellation Policy</a> for full details.</p>

<h2>8. Intellectual property</h2>
<p>All content on this site — text, imagery, design, logos, and product descriptions — is owned by or licensed to The Kashmir Weaver and protected by applicable copyright and trademark laws. You may not reproduce, distribute, or exploit any content without our written permission.</p>

<h2>9. User conduct</h2>
<p>You agree not to use the site for unlawful purposes, to transmit harmful or objectionable material, to gain unauthorised access to systems, or to interfere with other users or site operation.</p>

<h2>10. Limitation of liability</h2>
<p>The site and products are provided without warranties beyond those required by law. To the fullest extent permitted, The Kashmir Weaver shall not be liable for indirect, incidental, special, or consequential damages. Our total liability for any claim arising from these terms or your purchase is limited to the amount you paid for the product in question.</p>

<h2>11. Indemnity</h2>
<p>You agree to indemnify The Kashmir Weaver against claims arising from your breach of these terms, misuse of the site, or violation of any third-party rights.</p>

<h2>12. Electronic communications</h2>
<p>By using the site or emailing us, you consent to receive communications electronically. Agreements, notices, and disclosures provided electronically satisfy any legal requirement that they be in writing.</p>

<h2>13. Governing law</h2>
<p>These terms are governed by the laws of India. The courts of Srinagar, Jammu &amp; Kashmir shall have exclusive jurisdiction. Any dispute shall be referred to arbitration in Srinagar under the Arbitration and Conciliation Act, 1996, as amended.</p>

<h2>14. Changes</h2>
<p>We may modify these terms at any time. The current version is always available on this page. Continued use of the site after changes constitutes acceptance.</p>

<h2>15. Contact</h2>
<p><a href="mailto:${EMAIL}">${EMAIL}</a> · <a href="${TEL_HREF}">${PHONE}</a> · <a href="/concierge">Concierge</a></p>
`.trim();

export const DISCLAIMER_PAGE_HTML = `
<p class="policy-lead">By using ${SITE}, you unconditionally accept the terms and disclaimers set out below.</p>

<h2>Information on this site</h2>
<p>Before placing an order, please read product information, care guidance, and our FAQ carefully. All site content is for general information only. It does not constitute advice and should not be relied upon when making purchasing decisions.</p>

<h2>User-submitted content</h2>
<p>Certain areas of the site may contain material submitted by users. The Kashmir Weaver accepts no responsibility for the content or accuracy of such material.</p>

<h2>Third-party links</h2>
<p>We are not responsible for the contents of linked third-party sites and do not endorse the companies or products to which we link. Your access to external sites is entirely at your own risk.</p>

<h2>Product variations</h2>
<p>Product specifications (weight, colour, handwork details, size, and so on) are fairly accurate values. Because each piece is hand-woven, there may be slight variation between photographs and the actual product. This is a hallmark of artisan craft, not a defect.</p>

<h2>No warranty on site content</h2>
<p>The Kashmir Weaver will not be liable for any loss of data, profits, or damages arising from the use of or inability to use products or services offered on ${SITE}, including indirect or consequential damages. In no event shall our liability exceed the amount paid by you for the specific product or service in question.</p>

<h2>Pricing and availability</h2>
<p>We may change products, services, prices, and availability without prior notice. Prices displayed online may not reflect in-person or regional pricing. We reserve the right to limit quantities and refuse sales to resellers. We are not responsible for typographical or photographic errors.</p>

<h2>Clarifications</h2>
<p>If you have any doubt about a product or service, contact us in writing at <a href="mailto:${EMAIL}">${EMAIL}</a> before placing an order. Use of the site constitutes acceptance that you have read and understood these disclaimers.</p>

<h2>Governing law</h2>
<p>All use of ${SITE} is governed by the laws of Srinagar, Jammu &amp; Kashmir, India.</p>
`.trim();

export const FAQ_PAGE_HTML = `
<p class="policy-lead">Everything you need to know before bringing home a piece from The Kashmir Weaver — from ordering and delivery to authenticity and care.</p>

<h2>How do I make a purchase?</h2>
<p>Browse our <a href="/collections/all">collections</a>, select your piece, choose options where available, and add to cart. Review your selection in the cart, then proceed to secure checkout. You may also contact our <a href="/concierge">Concierge</a> for personal assistance.</p>

<h2>Do I need an account to place an order?</h2>
<p>You may check out as a guest or create an account for faster future orders and order history. Account registration is quick and part of the checkout flow when you choose to save your details.</p>

<h2>What should I do if I forget my password?</h2>
<p>Use the password reset link on the account sign-in page. Enter your email and follow the instructions sent to you. If you need further help, contact Concierge at <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>

<h2>How do I contact Customer Services?</h2>
<p>Email <a href="mailto:${EMAIL}">${EMAIL}</a> or call <a href="${TEL_HREF}">${PHONE}</a>. We aim to respond within 24 hours. You may also reach us via WhatsApp or through our <a href="/concierge#contact">Concierge contact form</a>.</p>

<h2>Can I place an order by telephone?</h2>
<p>Yes. Our Concierge team can assist with phone orders. Contact us at ${PHONE} or email ${EMAIL}.</p>

<h2>How do I know my pashmina is authentic?</h2>
<p>Every piece is authentic hand-woven Kashmiri pashmina. A Geographical Indication (GI) tag (GI No. 46) is available on request — contact Concierge before or after purchase.</p>

<h2>How long does shipping take?</h2>
<p>In-stock pieces dispatch within 2–4 business days. Delivery typically takes 5–7 working days within India and 7–12 working days internationally. Every order ships insured and tracked. See our <a href="/shipping">Shipping Policy</a> for full details.</p>

<h2>What is your returns policy?</h2>
<p>Ready-to-wear pieces may be returned within 14 days in unworn, original condition. Bespoke, made-to-order, and <strong>Solids</strong> (dyed to your selected colour after order) are final sale. See our <a href="/returns">Returns Policy</a>.</p>

<h2>What if an item is out of stock?</h2>
<p>Contact Concierge — we may be able to source the piece or suggest an alternative from our atelier.</p>

<h2>Can I add items to an existing order?</h2>
<p>Unfortunately we cannot combine or amend orders once placed. Cancel within 24 hours if not yet dispatched, then place a new combined order, or contact Concierge for guidance.</p>

<h2>Which payment methods do you accept?</h2>
<p>We accept payment through Shopify secure checkout. Methods shown at payment depend on your region and may include major credit and debit cards (Visa, Mastercard, American Express and others), UPI, net banking, wallets, and instalment options on eligible orders. Available methods are always listed before you confirm payment.</p>

<h2>Is it safe to use my card on your website?</h2>
<p>Yes. We use industry-standard SSL encryption. All orders are processed through Shopify secure checkout. We never store full card numbers on our servers.</p>

<h2>Can I cancel my order?</h2>
<p>Yes. You may cancel within 24 hours of payment confirmation if the order has not yet been dispatched. The refund is the order amount <strong>minus payment gateway fees</strong>. See our <a href="/cancellation">Cancellation Policy</a> or contact Concierge with your order number.</p>

<h2>What are your customer service hours?</h2>
<p>Concierge is available Monday–Saturday, 10:00–18:00 IST by email, phone, and WhatsApp. We aim to respond within 24 hours on business days.</p>

<h2>How should I care for my pashmina?</h2>
<p>See our <a href="/care-guide">Care Guide</a> for full instructions. We recommend specialist dry cleaning or gentle hand-washing in cold water — never wring or tumble dry.</p>
`.trim();

export const POLICY_UPDATES: Array<{type: string; body: string}> = [
  {type: 'SHIPPING_POLICY', body: SHIPPING_POLICY_HTML},
  {type: 'REFUND_POLICY', body: REFUND_POLICY_HTML},
  {type: 'TERMS_OF_SERVICE', body: TERMS_OF_SERVICE_HTML},
];

export const PAGE_UPDATES: Array<{
  handle: string;
  title: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
}> = [
  {
    handle: 'disclaimer',
    title: 'Disclaimer',
    body: DISCLAIMER_PAGE_HTML,
    seoTitle: 'Disclaimer — The Kashmir Weaver',
    seoDescription:
      'Terms of use and disclaimers for The Kashmir Weaver website.',
  },
  {
    handle: 'faq',
    title: 'FAQ',
    body: FAQ_PAGE_HTML,
    seoTitle: 'FAQ — The Kashmir Weaver',
    seoDescription:
      'Answers on ordering, shipping, returns, authenticity, and care for The Kashmir Weaver pashmina.',
  },
  {
    handle: 'cancellation',
    title: 'Cancellation Policy',
    body: CANCELLATION_POLICY_HTML,
    seoTitle: 'Cancellation Policy — The Kashmir Weaver',
    seoDescription:
      'How to cancel a The Kashmir Weaver order within 24 hours or after dispatch.',
  },
];
