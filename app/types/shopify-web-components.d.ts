import type {DetailedHTMLProps, HTMLAttributes} from 'react';

type ShopifyStoreProps = {
  'store-domain'?: string;
  'public-access-token'?: string;
  'customer-access-token'?: string | null;
};

type ShopifyAccountProps = {
  menu?: string;
  'sign-in-url'?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'shopify-store': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & ShopifyStoreProps,
        HTMLElement
      >;
      'shopify-account': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & ShopifyAccountProps,
        HTMLElement
      >;
    }
  }
}

export {};
