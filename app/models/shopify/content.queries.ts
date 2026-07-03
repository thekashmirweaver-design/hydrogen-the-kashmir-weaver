export const CONTENT_PAGE_QUERY = `#graphql
  query ContentPage(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
` as const;

export const SHOP_POLICY_QUERY = `#graphql
  fragment PolicyFields on ShopPolicy {
    body
    handle
    id
    title
    url
  }
  query ShopPolicy(
    $country: CountryCode
    $language: LanguageCode
    $privacyPolicy: Boolean!
    $termsOfService: Boolean!
  ) @inContext(language: $language, country: $country) {
    shop {
      privacyPolicy @include(if: $privacyPolicy) {
        ...PolicyFields
      }
      termsOfService @include(if: $termsOfService) {
        ...PolicyFields
      }
    }
  }
` as const;
