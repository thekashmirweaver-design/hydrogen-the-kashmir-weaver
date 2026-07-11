import {Link} from 'react-router';
import {
  ArrowRight,
} from 'lucide-react';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {CollectionStoryMobile} from '~/components/gulriza/CollectionStoryMobile';
import {CollectionHeroBanner} from '~/components/gulriza/CollectionHeroBanner';
import {FeaturedProducts} from '~/components/gulriza/FeaturedProducts';
import {HeroDeliveryLine} from '~/components/gulriza/HeroDeliveryLine';
import {Reveal} from '~/components/gulriza/Reveal';
import {OriginMap} from '~/components/gulriza/OriginMap';
import {ProductTile} from '~/components/gulriza/ProductTile';
import {ScrollIndicator} from '~/components/gulriza/ScrollIndicator';
import {TrustStrip} from '~/components/gulriza/TrustStrip';
import {EditorialImage, HeroPicture} from '~/components/gulriza/CatalogImage';
import {heroDark, heroLight} from '~/lib/hero-image-urls';
import {useTheme} from '~/lib/theme';
import type {Collection, Product} from '~/models/types';

const artisan = '/assets/craft-artisan.png';

export function HomeView({
  products,
  featuredProducts,
  featuredCollections,
  heroImageUrl,
  heroAlt,
  collectionPreviewCount = 3,
}: {
  products: Product[];
  collections?: Collection[];
  featuredProducts: Product[];
  featuredCollections: Collection[];
  journalPosts?: unknown[];
  heroImageUrl?: string;
  heroAlt?: string;
  bestSellingCount?: number;
  newestCount?: number;
  collectionPreviewCount?: number;
}) {
  return (
    <div>
      <Hero heroImageUrl={heroImageUrl} heroAlt={heroAlt} />
      <TrustStrip />
      <FeaturedProducts products={featuredProducts} />
      <SignatureCollections
        collections={featuredCollections}
        products={products}
        previewCount={collectionPreviewCount}
      />
      <CraftAndOrigin />
      <BespokeSection />
    </div>
  );
}

function Hero({
  heroImageUrl: heroImageUrlProp,
  heroAlt,
}: {
  heroImageUrl?: string;
  heroAlt?: string;
}) {
  const {resolved} = useTheme();
  const isLight = resolved === 'light';
  const darkAlt =
    heroAlt ||
    'A woman wrapped in an emerald pashmina shawl, framed by a stone arch overlooking a Himalayan lake at dusk.';
  const lightAlt =
    'A woman wrapped in a cream embroidered pashmina shawl, framed by a stone arch overlooking a Himalayan lake at golden hour.';
  const sizes = '(min-width: 768px) 55vw, 100vw';
  const pictureClass =
    'absolute inset-0 h-full w-full object-cover edge-fade-left';
  const pictureStyle = {objectPosition: 'center'} as const;

  // Optional Shopify/metafield override replaces the dark hero only.
  const shopifyHero = Boolean(heroImageUrlProp);
  const darkJpg = heroImageUrlProp || heroDark.jpg;
  const darkUsesLocalSet = !heroImageUrlProp;

  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden">
      <div className="absolute inset-y-0 right-0 w-full md:w-[62%] lg:w-[55%]">
        <div className="hero-theme-layer hero-theme-layer--dark">
          {shopifyHero ? (
            <EditorialImage
              src={darkJpg}
              alt={darkAlt}
              className={pictureClass}
              style={pictureStyle}
              sizes={sizes}
              priority={!isLight}
              loading={isLight ? 'lazy' : 'eager'}
              fetchPriority={isLight ? 'low' : 'high'}
              showSkeleton={false}
            />
          ) : (
            <HeroPicture
              jpg={darkJpg}
              jpgSmall={darkUsesLocalSet ? heroDark.jpgSmall : undefined}
              webp={darkUsesLocalSet ? heroDark.webp : undefined}
              webpSmall={darkUsesLocalSet ? heroDark.webpSmall : undefined}
              avif={darkUsesLocalSet ? heroDark.avif : undefined}
              avifSmall={darkUsesLocalSet ? heroDark.avifSmall : undefined}
              alt={darkAlt}
              className={pictureClass}
              style={pictureStyle}
              sizes={sizes}
              width={1536}
              height={2048}
              loading={isLight ? 'lazy' : 'eager'}
              fetchPriority={isLight ? 'low' : 'high'}
            />
          )}
        </div>
        <div className="hero-theme-layer hero-theme-layer--light">
          <HeroPicture
            jpg={heroLight.jpg}
            jpgSmall={heroLight.jpgSmall}
            webp={heroLight.webp}
            webpSmall={heroLight.webpSmall}
            avif={heroLight.avif}
            avifSmall={heroLight.avifSmall}
            alt={lightAlt}
            className={pictureClass}
            style={pictureStyle}
            sizes={sizes}
            width={1536}
            height={2048}
            loading={isLight ? 'eager' : 'lazy'}
            fetchPriority={isLight ? 'high' : 'low'}
          />
        </div>
        <div className="vignette-overlay pointer-events-none absolute inset-0" />
        {/* Left/bottom scrim — uses --photo-scrim-rgb (warm in light, forest in dark) */}
        <div
          className="hero-photo-scrim pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgb(var(--photo-scrim-rgb) / 0.72) 0%, rgb(var(--photo-scrim-rgb) / 0.35) 42%, transparent 68%), linear-gradient(to top, rgb(var(--photo-scrim-rgb) / 0.78) 0%, rgb(var(--photo-scrim-rgb) / 0.28) 38%, transparent 62%)',
          }}
        />
      </div>

      <div className="home-hero-copy absolute left-6 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex lg:left-10 xl:left-16">
        <span className="eyebrow">01</span>
        <span className="h-10 w-px home-hero-rail-rule" />
        <span className="tracked text-muted-foreground">02</span>
        <span className="tracked text-muted-foreground">03</span>
        <span className="tracked text-muted-foreground">04</span>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1600px] items-center px-6 pb-44 pt-10 md:px-20 md:py-0 lg:px-28 xl:px-36">
        <div className="home-hero-copy mt-auto max-w-2xl md:-mt-32 lg:-mt-10">
          <Eyebrow>Hand-woven Kashmiri pashmina</Eyebrow>
          <h1
            className="font-display mt-8 text-[2.5rem] leading-[1.05] tracking-tight sm:text-[3.5rem] md:text-[4.75rem]"
            style={{fontWeight: 300}}
          >
            Not just a shawl.
            <br />
            <span style={{fontStyle: 'italic'}}>A story of Kashmir.</span>
          </h1>

          <HeroDeliveryLine />

          <Link
            to="/collections/all"
            className="home-hero-cta mt-8 md:mt-10 inline-flex items-center gap-6 rounded-full border px-8 py-4 backdrop-blur-md transition-all duration-300 group animate-glass-glaze"
            style={{
              backgroundColor: 'rgb(var(--photo-scrim-rgb) / 0.4)',
              borderColor: 'color-mix(in srgb, var(--on-photo-fg) 28%, transparent)',
              color: 'var(--on-photo-fg)',
            }}
          >
            <span className="relative z-20 tracked text-xs md:text-sm font-medium uppercase tracking-[0.15em] md:tracking-[0.2em]">
              Shop the atelier
            </span>
            <span
              className="home-hero-cta-arrow relative z-20 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1.5"
              style={{color: 'var(--on-photo-accent)'}}
            >
              <ArrowRight className="h-4 w-4 md:h-4 md:w-4" strokeWidth={1.5} />
            </span>
          </Link>
        </div>
      </div>

      <ScrollIndicator
        onPhoto
        className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-10 -translate-x-1/2 md:bottom-10"
      />
    </section>
  );
}

function ExploreCollectionCta({
  handle,
  name,
  onPhoto = false,
}: {
  handle: string;
  name: string;
  onPhoto?: boolean;
}) {
  return (
    <Link
      to={`/collections/${handle}`}
      prefetch="intent"
      className={
        onPhoto
          ? 'mt-8 inline-flex min-h-11 w-max items-center gap-3 rounded-full border px-5 py-3 text-[0.65rem] font-medium tracking-widest uppercase transition-all duration-300 hover:opacity-90 active:opacity-80 md:mt-10 md:text-xs'
          : 'mt-8 inline-flex min-h-11 w-max items-center gap-3 rounded-full border border-accent/40 bg-accent/5 px-5 py-3 text-[0.65rem] font-medium tracking-widest text-accent uppercase transition-all duration-300 hover:bg-accent/10 active:opacity-80 md:mt-10 md:text-xs'
      }
      style={
        onPhoto
          ? {
              borderColor: 'color-mix(in srgb, var(--on-photo-accent) 55%, transparent)',
              color: 'var(--on-photo-accent)',
              background: 'rgb(var(--photo-scrim-rgb) / 0.32)',
            }
          : undefined
      }
    >
      Shop {name} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function SignatureCollections({
  collections,
  products,
  previewCount = 3,
}: {
  collections: Collection[];
  products: Product[];
  previewCount?: number;
}) {
  return (
    <section className="relative py-32 md:py-40">
      <div className="mx-auto max-w-[1600px] px-6 md:px-10">
        <Reveal className="max-w-2xl">
          <Eyebrow>Signature collections</Eyebrow>
          <h2
            className="font-display mt-6 text-4xl leading-[1.1] sm:text-5xl md:text-[3.75rem]"
            style={{fontWeight: 400}}
          >
            Choose a weave
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Each collection is a different language of the same fibre — pick the one that speaks to you.
          </p>
        </Reveal>
      </div>

      <div className="mt-24 flex flex-col gap-32 md:gap-40">
        {collections.map((c, i) => {
          const previewProducts = products
            .filter((p) => p.collectionSlug === c.handle)
            .slice(0, previewCount);
          const nameParts = c.name.split(' ');
          const firstName = nameParts[0];
          const restName = nameParts.slice(1).join(' ');

          return (
            <div key={c.handle}>
              {i > 0 && (
                <div className="mx-auto mb-32 max-w-[1600px] px-6 md:mb-40 md:px-10">
                  <Hairline />
                </div>
              )}
              <Reveal className="relative w-full">
                <CollectionHeroBanner hero={c.hero} zoomOnHover>
                  <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1600px] px-6 pb-10 md:px-10 md:pb-16">
                    <Eyebrow>{c.tagline}</Eyebrow>
                    <h3
                      className="font-display mt-4 text-3xl leading-[1.1] text-[var(--on-photo-fg)] sm:text-4xl md:mt-6 md:text-5xl"
                      style={{fontWeight: 400}}
                    >
                      {firstName}{' '}
                      {restName ? (
                        <span style={{fontStyle: 'italic'}}>{restName}</span>
                      ) : null}
                    </h3>
                    <p className="mt-6 hidden max-w-xl text-base leading-relaxed text-[var(--on-photo-muted)] md:block">
                      {c.story}
                    </p>
                    <div className="hidden md:block">
                      <ExploreCollectionCta handle={c.handle} name={c.name} onPhoto />
                    </div>
                  </div>
                </CollectionHeroBanner>

                <div className="mx-auto max-w-[1600px] px-6 pt-8 md:hidden">
                  <CollectionStoryMobile text={c.story} />
                  <ExploreCollectionCta handle={c.handle} name={c.name} />
                </div>
              </Reveal>

              <div className="mx-auto mt-20 max-w-[1600px] px-6 md:px-10">
                <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 md:gap-x-8 lg:grid-cols-3">
                  {previewProducts.map((p, j) => (
                    <Reveal key={p.handle} delay={j * 120}>
                      <ProductTile
                        product={p}
                        priority={false}
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      />
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}

function CraftAndOrigin() {
  return (
    <section className="relative py-32 md:py-40" style={{background: 'var(--surface)'}}>
      <div className="absolute inset-y-0 left-0 hidden w-1/2 lg:block">
        <EditorialImage
          src={artisan}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-70"
          style={{
            maskImage: 'linear-gradient(to right, black 50%, transparent 90%)',
            WebkitMaskImage: 'linear-gradient(to right, black 50%, transparent 90%)',
          }}
          sizes="50vw"
        />
      </div>

      <div className="relative mx-auto grid max-w-[1600px] gap-16 px-6 md:px-10 lg:grid-cols-2">
        <div className="hidden lg:block" />
        <Reveal>
          <Eyebrow>Our Origin & Craft</Eyebrow>
          <h2
            className="font-display mt-6 text-4xl leading-[1.1] sm:text-5xl md:text-[3.5rem]"
            style={{fontWeight: 400}}
          >
            Born in the Himalayas.
            <br />
            <span style={{fontStyle: 'italic'}}>Woven by a single artisan.</span>
          </h2>
          <p className="mt-8 max-w-md text-base leading-relaxed text-muted-foreground">
            Each pashmina is the work of one master across weeks of patient, unhurried hand. From
            the Changthang plateau to the looms of Srinagar, no two are alike.
          </p>
          <div className="mt-12">
            <OriginMap />
          </div>
          <div className="mt-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Link
              to="/heritage"
              className="inline-flex items-center gap-5 text-foreground transition hover:text-accent"
            >
              <span className="tracked">Read our heritage</span>
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
                style={{borderColor: 'var(--border)'}}
              >
                <ArrowRight className="h-4 w-4" strokeWidth={1} />
              </span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function BespokeSection() {
  const services = [
    {name: 'Bespoke Pashmina', note: 'Designed with you, woven for you.'},
    {name: 'Wedding Gifting', note: 'Trousseau and ceremony.'},
    {name: 'Corporate Gifting', note: 'Considered gestures, at scale.'},
    {name: 'Private Appointments', note: 'By invitation, in our atelier.'},
    {name: 'Personal Concierge', note: 'Selection, styling and worldwide delivery.'},
  ];
  return (
    <section className="relative py-32 md:py-40" style={{background: 'var(--surface)'}}>
      <div className="mx-auto max-w-[1100px] px-6 md:px-10">
        <Reveal className="text-center">
          <Eyebrow>Concierge</Eyebrow>
          <h2
            className="font-display mx-auto mt-6 max-w-3xl text-4xl leading-[1.1] sm:text-5xl md:text-[3.5rem]"
            style={{fontWeight: 400}}
          >
            Need help choosing?
            <br />
            <span style={{fontStyle: 'italic'}}>We are here for bespoke and gifting.</span>
          </h2>
        </Reveal>

        <div className="mx-auto mt-20 max-w-3xl">
          {services.map((s) => (
            <Reveal key={s.name}>
              <Hairline />
              <div className="flex items-start justify-between gap-4 py-7 md:items-center">
                <div
                  className="font-display max-w-[50%] text-xl md:text-2xl"
                  style={{fontWeight: 400}}
                >
                  {s.name}
                </div>
                <div className="max-w-[50%] text-right text-sm text-muted-foreground">{s.note}</div>
              </div>
            </Reveal>
          ))}
          <Hairline />
        </div>

        <div className="mt-16 text-center">
          <Link
            to="/concierge"
            className="inline-flex items-center gap-5 text-foreground transition hover:text-accent"
          >
            <span className="tracked">Speak with concierge</span>
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
              style={{borderColor: 'var(--accent)'}}
            >
              <ArrowRight className="h-4 w-4" strokeWidth={1} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
