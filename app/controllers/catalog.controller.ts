import * as CatalogRepository from '~/models/catalog.repository';
import type {CatalogOptions} from '~/models/catalog.repository';
import type {CatalogSnapshot, Collection, Product} from '~/models/types';
import {
  loadHomepageFeatured,
  pickCollectionsByHandles,
} from '~/lib/homepage-featured';
import {resolveCatalogSnapshot} from '~/lib/shared-catalog';
import {truncateMetaDescription} from '~/lib/meta-description';

/** Matches store shipping policy: free worldwide over $200; otherwise $25 international. */
const FREE_SHIPPING_THRESHOLD = 200;
const INTERNATIONAL_SHIPPING_RATE = 25;

function offerShippingDetails(
  priceAmount: number,
  currencyCode: string,
): Array<Record<string, unknown>> {
  const internationalRate =
    priceAmount >= FREE_SHIPPING_THRESHOLD ? 0 : INTERNATIONAL_SHIPPING_RATE;

  const rate = (value: number) => ({
    '@type': 'MonetaryAmount',
    value: String(value),
    currency: currencyCode,
  });

  const deliveryTime = (transitMin: number, transitMax: number) => ({
    '@type': 'ShippingDeliveryTime',
    handlingTime: {
      '@type': 'QuantitativeValue',
      minValue: 2,
      maxValue: 4,
      unitCode: 'DAY',
    },
    transitTime: {
      '@type': 'QuantitativeValue',
      minValue: transitMin,
      maxValue: transitMax,
      unitCode: 'DAY',
    },
  });

  return [
    {
      '@type': 'OfferShippingDetails',
      shippingRate: rate(0),
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'IN',
      },
      deliveryTime: deliveryTime(5, 7),
    },
    {
      '@type': 'OfferShippingDetails',
      shippingRate: rate(internationalRate),
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'US',
      },
      deliveryTime: deliveryTime(7, 12),
    },
  ];
}

function merchantReturnPolicy(): Record<string, unknown> {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: ['IN', 'US'],
    returnPolicyCategory:
      'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 14,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
    url: '/returns',
  };
}

export type PageMetadata = {
  title: string;
  description?: string;
};

export type HomePageViewModel = {
  products: Product[];
  collections: Collection[];
  featuredProducts: Product[];
  featuredCollections: Collection[];
};

export async function getHomePage(
  options?: CatalogOptions,
  featured?: Awaited<ReturnType<typeof loadHomepageFeatured>>,
  catalog?: CatalogSnapshot,
): Promise<HomePageViewModel> {
  const {products, collections} = await resolveCatalogSnapshot(options, catalog);
  const featuredProducts = await CatalogRepository.listFeaturedCollectionProducts(
    options,
    featured?.featuredCollectionHandle,
    featured?.featuredCount ?? 8,
  );
  const featuredCollections = pickCollectionsByHandles(
    collections,
    featured?.collectionHandles ?? [],
    {limit: featured?.collectionCount},
  );
  return {products, collections, featuredProducts, featuredCollections};
}

export type ProductPageViewModel = {
  product: Product;
  relatedProducts: Product[];
  metadata: PageMetadata;
  productLd: Record<string, unknown>;
  breadcrumbLd: Record<string, unknown>;
};

export async function getProductPage(
  handle: string,
  options?: CatalogOptions,
  catalog?: CatalogSnapshot,
): Promise<ProductPageViewModel | null> {
  const snapshot = await resolveCatalogSnapshot(options, catalog);
  const product =
    snapshot.products.find((item) => item.handle === handle) ??
    (await CatalogRepository.findProductByHandle(handle, options));
  if (!product) return null;

  const relatedProducts = snapshot.products
    .filter(
      (p) =>
        p.handle !== product.handle &&
        p.collectionSlug === product.collectionSlug,
    )
    .slice(0, 3);

  const url = `/products/${handle}`;
  const title = product.seo?.title ?? `${product.name} — The Kashmir Weaver`;
  const description = truncateMetaDescription(
    product.seo?.description ?? product.shortDescription,
  );

  const inStock =
    product.variants?.some((v) => v.availableForSale) ?? product.stock === 'in';

  const primarySku =
    product.variants?.find((v) => v.sku)?.sku ?? product.variants?.[0]?.sku;

  const productLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: truncateMetaDescription(product.shortDescription),
      image: product.images.map((i) => i.src),
      brand: {'@type': 'Brand', name: 'The Kashmir Weaver'},
      material: product.material,
      category: product.collectionName,
      ...(primarySku ? {sku: primarySku} : {}),
      offers: {
        '@type': 'Offer',
        price: product.price.amount,
        priceCurrency: product.price.currencyCode,
        itemCondition: 'https://schema.org/NewCondition',
        availability: inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url,
        shippingDetails: offerShippingDetails(
          product.price.amount,
          product.price.currencyCode,
        ),
        hasMerchantReturnPolicy: merchantReturnPolicy(),
      },
    };

  if (product.reviews) {
    productLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.reviews.rating,
      reviewCount: product.reviews.count,
    };
  }

  return {
    product,
    relatedProducts,
    metadata: {title, description},
    productLd,
    breadcrumbLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {'@type': 'ListItem', position: 1, name: 'Home', item: '/'},
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Collections',
          item: '/collections',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: product.collectionName,
          item: `/collections/${product.collectionSlug}`,
        },
        {'@type': 'ListItem', position: 4, name: product.name, item: url},
      ],
    },
  };
}

export async function listProductHandles(
  options?: CatalogOptions,
): Promise<string[]> {
  const products = await CatalogRepository.listProducts(options);
  return products.map((p) => p.handle);
}
