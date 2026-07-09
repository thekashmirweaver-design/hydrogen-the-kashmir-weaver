import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/policies._index';
import type {PoliciesQuery, PolicyItemFragment} from 'storefrontapi.generated';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';

const BRANDED_POLICY_PATHS: Record<string, string> = {
  'privacy-policy': '/privacy',
  'terms-of-service': '/terms',
  'shipping-policy': '/shipping',
  'refund-policy': '/returns',
};

export async function loader({context}: Route.LoaderArgs) {
  const data: PoliciesQuery = await context.storefront.query(POLICIES_QUERY);

  const shopPolicies = data.shop;
  const policies: PolicyItemFragment[] = [
    shopPolicies?.privacyPolicy,
    shopPolicies?.shippingPolicy,
    shopPolicies?.termsOfService,
    shopPolicies?.refundPolicy,
    shopPolicies?.subscriptionPolicy,
  ].filter((policy): policy is PolicyItemFragment => policy != null);

  if (!policies.length) {
    throw new Response('No policies found', {status: 404});
  }

  return {policies};
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <section className="mx-auto max-w-[800px] px-6 pt-8 pb-24 md:px-10">
      <Reveal>
        <Eyebrow>Legal</Eyebrow>
        <h1
          className="font-display mt-6 text-4xl leading-[1.05] sm:text-5xl md:text-7xl"
          style={{fontWeight: 300}}
        >
          Policies
        </h1>
        <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
          Our written policies governing delivery, returns, and your use of this site.
        </p>
      </Reveal>

      <Hairline className="my-12" />

      <ul className="space-y-4">
        {policies.map((policy) => {
          const brandedPath = BRANDED_POLICY_PATHS[policy.handle];
          const to = brandedPath ?? `/policies/${policy.handle}`;

          return (
            <li key={policy.id}>
              <Link
                to={to}
                className="font-display block text-xl text-foreground transition hover:text-accent md:text-2xl"
                style={{fontWeight: 400}}
              >
                {policy.title}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-12">
        <Link to="/disclaimer" className="tracked text-muted-foreground hover:text-accent">
          Disclaimer
        </Link>
      </div>
    </section>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
      subscriptionPolicy {
        id
        title
        handle
      }
    }
  }
` as const;
