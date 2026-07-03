import * as CatalogRepository from '~/models/catalog.repository';
import type {Collection, Product} from '~/models/types';

export type PageMetadata = {
  title: string;
  description?: string;
};

export type HomePageViewModel = {
  products: Product[];
  collections: Collection[];
};

export async function getHomePage(): Promise<HomePageViewModel> {
  const [products, collections] = await Promise.all([
    CatalogRepository.listProducts(),
    CatalogRepository.listCollections(),
  ]);
  return {products, collections};
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
): Promise<ProductPageViewModel | null> {
  const product = await CatalogRepository.findProductByHandle(handle);
  if (!product) return null;

  const allProducts = await CatalogRepository.listProducts();
  const relatedProducts = allProducts
    .filter(
      (p) =>
        p.handle !== product.handle &&
        p.collectionSlug === product.collectionSlug,
    )
    .slice(0, 3);

  const url = `/products/${handle}`;
  const title = product.seo?.title ?? `${product.name} — The Kashmir Weaver`;
  const description =
    product.seo?.description ?? product.shortDescription;

  return {
    product,
    relatedProducts,
    metadata: {title, description},
    productLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.shortDescription,
      image: product.images.map((i) => i.src),
      brand: {'@type': 'Brand', name: 'The Kashmir Weaver'},
      material: product.material,
      category: product.collectionName,
      offers: {
        '@type': 'Offer',
        price: product.price.amount,
        priceCurrency: product.price.currencyCode,
        availability:
          product.stock === 'in'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        url,
      },
    },
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

export async function listProductHandles(): Promise<string[]> {
  const products = await CatalogRepository.listProducts();
  return products.map((p) => p.handle);
}
