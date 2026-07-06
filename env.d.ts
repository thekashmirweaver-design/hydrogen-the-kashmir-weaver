/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';
import type {HydrogenEnv} from '@shopify/hydrogen';

declare global {
  interface Env extends HydrogenEnv {
    USE_STATIC_CATALOG?: string;
    /** Resend API key — concierge inquiries are emailed to Gmail. */
    RESEND_API_KEY?: string;
    /** Inbox for concierge form submissions (default: thekashmirweaver@gmail.com). */
    CONCIERGE_EMAIL_TO?: string;
    /** Verified sender in Resend (default: concierge@thekashmirweaver.in). */
    CONCIERGE_EMAIL_FROM?: string;
    /** Canonical storefront URL (e.g. https://thekashmirweaver.in). Used by seed scripts and CSP. */
    PUBLIC_STORE_URL?: string;
  }
}
