import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/policies.$handle';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';
import {truncateMetaDescription} from '~/lib/meta-description';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const title = `${data?.policy.title ?? 'Policy'} — The Kashmir Weaver`;
  const bodyText = data?.policy.body?.replace(/<[^>]+>/g, ' ').trim() ?? '';
  const description = bodyText
    ? truncateMetaDescription(bodyText)
    : undefined;
  const storeUrl = getStoreUrlFromMatches(matches);
  return seoBundle({
    metadata: {title, description},
    pathname: location.pathname,
    storeUrl,
  });
};

export async function loader({params, context}: Route.LoaderArgs) {
  if (!params.handle) {
    throw new Response('No handle was passed in', {status: 404});
  }

  const policyName = params.handle.replace(
    /-([a-z])/g,
    (_: unknown, m1: string) => m1.toUpperCase(),
  ) as 'privacyPolicy' | 'shippingPolicy' | 'termsOfService' | 'refundPolicy';

  const data = await context.storefront.query(POLICY_CONTENT_QUERY, {
    variables: {
      privacyPolicy: false,
      shippingPolicy: false,
      termsOfService: false,
      refundPolicy: false,
      [policyName]: true,
      language: context.storefront.i18n?.language,
    },
  });

  const policy = data.shop?.[policyName];

  if (!policy) {
    throw new Response('Could not find the policy', {status: 404});
  }

  return {policy};
}

export default function PolicyRoute() {
  const {policy} = useLoaderData<typeof loader>();

  return (
    <section className="mx-auto max-w-[900px] px-6 pt-32 pb-24 md:px-10">
      <Reveal>
        <Eyebrow>Legal</Eyebrow>
        <h1
          className="font-display mt-8 text-4xl leading-tight md:text-5xl"
          style={{fontWeight: 400}}
        >
          {policy.title}
        </h1>
      </Reveal>
      <Hairline className="my-12" />
      <div
        className="prose-invert space-y-6 text-sm leading-relaxed text-muted-foreground [&_a]:text-accent [&_h2]:font-display [&_h2]:text-foreground [&_h3]:font-display [&_h3]:text-foreground"
        dangerouslySetInnerHTML={{__html: policy.body}}
      />
      <div className="mt-16">
        <Link to="/" className="tracked text-muted-foreground hover:text-accent">
          ← Return home
        </Link>
      </div>
    </section>
  );
}

const POLICY_CONTENT_QUERY = `#graphql
  fragment Policy on ShopPolicy {
    body
    handle
    id
    title
    url
  }
  query Policy(
    $country: CountryCode
    $language: LanguageCode
    $privacyPolicy: Boolean!
    $refundPolicy: Boolean!
    $shippingPolicy: Boolean!
    $termsOfService: Boolean!
  ) @inContext(language: $language, country: $country) {
    shop {
      privacyPolicy @include(if: $privacyPolicy) {
        ...Policy
      }
      shippingPolicy @include(if: $shippingPolicy) {
        ...Policy
      }
      termsOfService @include(if: $termsOfService) {
        ...Policy
      }
      refundPolicy @include(if: $refundPolicy) {
        ...Policy
      }
    }
  }
` as const;
