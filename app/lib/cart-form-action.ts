/** True when a fetcher/form targets the cart route action. */
export function isCartFormAction(formAction: string | undefined): boolean {
  if (!formAction) return false;
  try {
    const path = new URL(formAction, 'http://localhost').pathname;
    return path === '/cart' || path.endsWith('/cart');
  } catch {
    return formAction.includes('/cart');
  }
}
