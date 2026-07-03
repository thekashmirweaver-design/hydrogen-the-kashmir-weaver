export const JOURNAL_BLOG_QUERY = `#graphql
  query JournalBlog(
    $blogHandle: String!
    $first: Int
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      title
      seo {
        title
        description
      }
      articles(first: $first) {
        nodes {
          handle
          title
          excerpt
          contentHtml
          publishedAt
          tags
          image {
            url
            altText
            width
            height
          }
        }
      }
    }
  }
` as const;

export const JOURNAL_ARTICLE_QUERY = `#graphql
  query JournalArticle(
    $blogHandle: String!
    $articleHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      articleByHandle(handle: $articleHandle) {
        handle
        title
        contentHtml
        publishedAt
        tags
        image {
          url
          altText
          width
          height
        }
        seo {
          title
          description
        }
      }
    }
  }
` as const;

export const JOURNAL_BLOG_HANDLE = 'journal';
