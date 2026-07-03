import type {CatalogSnapshot, Collection, Product} from './types';
import * as StaticRepository from './static/repository';

export async function listProducts(): Promise<Product[]> {
  return StaticRepository.products;
}

export async function findProductByHandle(
  handle: string,
): Promise<Product | undefined> {
  return StaticRepository.getProduct(handle);
}

export async function listCollections(): Promise<Collection[]> {
  return StaticRepository.collections;
}

export async function findCollectionByHandle(
  handle: string,
): Promise<Collection | undefined> {
  return StaticRepository.getCollection(handle);
}

export async function listProductsByCollection(
  handle: string,
): Promise<Product[]> {
  return StaticRepository.productsByCollection(handle);
}

export async function listWeaveFacets(): Promise<string[]> {
  const items = await listProducts();
  return Array.from(new Set(items.map((p) => p.weave))).sort();
}

export async function listOriginFacets(): Promise<string[]> {
  const items = await listProducts();
  return Array.from(new Set(items.map((p) => p.origin))).sort();
}

export async function getCatalogSnapshot(): Promise<CatalogSnapshot> {
  const [products, collections] = await Promise.all([
    listProducts(),
    listCollections(),
  ]);
  return {products, collections};
}
