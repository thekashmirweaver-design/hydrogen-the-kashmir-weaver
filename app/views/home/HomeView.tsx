import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {CollectionStoryMobile} from '~/components/gulriza/CollectionStoryMobile';
import {CollectionHeroBanner} from '~/components/gulriza/CollectionHeroBanner';
import {FeaturedProducts} from '~/components/gulriza/FeaturedProducts';
import {HeroDeliveryLine} from '~/components/gulriza/HeroDeliveryLine';
import {Reveal} from '~/components/gulriza/Reveal';
import {OriginMap} from '~/components/gulriza/OriginMap';
import {ProductTile} from '~/components/gulriza/ProductTile';
import {ScrollIndicator} from '~/components/gulriza/ScrollIndicator';
import {ProductCarousel} from '~/components/gulriza/ProductCarousel';
import {EditorialImage, HeroPicture} from '~/components/gulriza/CatalogImage';
import {
  heroImage as heroImageUrl,
  heroImage800,
  heroImageAvif,
  heroImage800Avif,
} from '~/lib/hero-image-urls';
import type {Collection, Product} from '~/models/types';
import type {JournalPost} from '~/models/static/journal';

const heroPortrait = '/assets/hero-portrait.jpg';
const artisan = '/assets/craft-artisan.png';

function bestSellingScore(p: Product): number {
  return (p.tags?.some((t) => /best-?sell/i.test(t)) ? 2 : 0) + (p.limited ? 1 : 0);
}

function sortBestSelling(products: Product[]): Product[] {
  return [...products].sort((a, b) => bestSellingScore(b) - bestSellingScore(a));
}

function sortNewest(products: Product[]): Product[] {
  return [...products].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function HomeView({
  products,
  collections,
  featuredProducts,
  featuredCollections,
  journalPosts = [],
  heroImageUrl,
  heroAlt,
  bestSellingCount = 8,
  newestCount = 8,
  collectionPreviewCount = 3,
}: {
  products: Product[];
  collections: Collection[];
  featuredProducts: Product[];
  featuredCollections: Collection[];
  journalPosts?: JournalPost[];
  heroImageUrl?: string;
  heroAlt?: string;
  bestSellingCount?: number;
  newestCount?: number;
  collectionPreviewCount?: number;
}) {
  const bestSellingProducts = sortBestSelling(products).slice(0, bestSellingCount);
  const newestProducts = sortNewest(products).slice(0, newestCount);

  return (
    <div>
      <Hero heroImageUrl={heroImageUrl} heroAlt={heroAlt} />
      <FeaturedProducts products={featuredProducts} />
      <ProductCarouselSection
        products={bestSellingProducts}
        title="Best Selling"
        ctaLabel="View All Best Selling"
        ctaHref="/collections/all?sort=best-selling"
      />
      <ProductCarouselSection
        products={newestProducts}
        title="Newest Pieces"
        ctaLabel="View All Newest"
        ctaHref="/collections/all?sort=newest"
      />
      <SignatureCollections
        collections={featuredCollections}
        products={products}
        previewCount={collectionPreviewCount}
      />
      <CraftAndOrigin />
      {journalPosts.length > 0 ? <JournalSection posts={journalPosts} /> : null}
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
  const src = heroImageUrlProp || heroPortrait;
  const alt =
    heroAlt ||
    'A woman wrapped in an emerald pashmina shawl, framed by a stone arch overlooking a Himalayan lake at dusk.';
  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden">
      <div className="absolute inset-y-0 right-0 w-full md:w-[62%] lg:w-[55%]">
        <HeroPicture
          jpg={src}
          jpgSmall={heroImage800}
          avif={heroImageAvif}
          avifSmall={heroImage800Avif}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover edge-fade-left"
          style={{objectPosition: 'center'}}
          sizes="(min-width: 768px) 55vw, 100vw"
        />
        <div className="vignette-overlay pointer-events-none absolute inset-0" />
      </div>

      <div className="absolute left-6 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex lg:left-10 xl:left-16">
        <span className="eyebrow text-foreground">01</span>
        <span className="h-10 w-px" style={{background: 'var(--accent)'}} />
        <span className="tracked text-muted-foreground">02</span>
        <span className="tracked text-muted-foreground">03</span>
        <span className="tracked text-muted-foreground">04</span>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1600px] items-center px-6 pb-44 pt-[calc(var(--header-h)+2rem)] md:px-20 md:py-0 lg:px-28 xl:px-36">
        <Reveal className="mt-auto max-w-2xl md:-mt-32 lg:-mt-10">
          <Eyebrow>Pure Origin · Rare Luxury</Eyebrow>
          <h1
            className="font-display mt-8 text-[2.5rem] leading-[1.05] tracking-tight sm:text-[3.5rem] md:text-[4.75rem]"
            style={{fontWeight: 300}}
          >
            Not just a shawl.
            <br />
            A second skin.
            <br />
            <span style={{fontStyle: 'italic'}}>A story of Kashmir.</span>
          </h1>

          <HeroDeliveryLine />

          <Link
            to="/collections"
            className="mt-8 md:mt-10 inline-flex items-center gap-6 rounded-full border px-8 py-4 text-foreground backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/30 group animate-glass-glaze"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.15)',
            }}
          >
            <span className="relative z-20 tracked text-xs md:text-sm font-medium uppercase tracking-[0.15em] md:tracking-[0.2em]">
              Explore Collection
            </span>
            <span className="relative z-20 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1.5 text-accent">
              <ArrowRight className="h-4 w-4 md:h-4 md:w-4" strokeWidth={1.5} />
            </span>
          </Link>
        </Reveal>
      </div>

      <ScrollIndicator className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-10 -translate-x-1/2 md:bottom-10" />
    </section>
  );
}

function ProductCarouselSection({
  products,
  title,
  ctaLabel,
  ctaHref,
}: {
  products: Product[];
  title: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  if (!products.length) return null;
  return (
    <section className="relative py-20 md:py-32" style={{background: 'var(--surface)'}}>
      <div className="mx-auto max-w-[1600px] px-6 md:px-10">
        <Reveal className="mb-12 flex items-end justify-between">
          <div>
            <Eyebrow>The Atelier</Eyebrow>
            <h2 className="font-display mt-4 text-3xl md:text-5xl" style={{fontWeight: 400}}>
              {title}
            </h2>
          </div>
          <Link
            to={ctaHref}
            className="tracked hidden items-center gap-3 px-6 py-3 font-medium transition hover:opacity-90 md:inline-flex"
            style={{background: 'var(--accent)', color: 'var(--background)'}}
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Reveal>
        <ProductCarousel products={products} />
        <Reveal className="mt-12 text-center md:hidden">
          <Link
            to={ctaHref}
            className="tracked inline-flex w-full items-center justify-center gap-3 px-10 py-4 font-medium transition hover:opacity-90 sm:w-auto"
            style={{background: 'var(--accent)', color: 'var(--background)'}}
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function ExploreCollectionCta({handle, name}: {handle: string; name: string}) {
  return (
    <Link
      to={`/collections/${handle}`}
      prefetch="intent"
      className="mt-8 inline-flex min-h-11 w-max items-center gap-3 rounded-full border border-accent/40 bg-accent/5 px-5 py-3 text-[0.65rem] font-medium tracking-widest text-accent uppercase transition-all duration-300 hover:bg-accent/10 active:opacity-80 md:mt-10 md:text-xs"
    >
      Explore {name} <ArrowRight className="h-3.5 w-3.5" />
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
          <Eyebrow>Signature Collections</Eyebrow>
          <h2
            className="font-display mt-6 text-4xl leading-[1.1] sm:text-5xl md:text-[3.75rem]"
            style={{fontWeight: 400}}
          >
            Every weave,
            <br />
            <span style={{fontStyle: 'italic'}}>a world of its own.</span>
          </h2>
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
                <CollectionHeroBanner hero={c.hero}>
                  <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1600px] px-6 pb-10 md:px-10 md:pb-16">
                    <Eyebrow>{c.tagline}</Eyebrow>
                    <h3
                      className="font-display mt-4 text-3xl leading-[1.1] sm:text-4xl md:mt-6 md:text-5xl"
                      style={{fontWeight: 400}}
                    >
                      {firstName}{' '}
                      {restName ? (
                        <span style={{fontStyle: 'italic'}}>{restName}</span>
                      ) : null}
                    </h3>
                    <p className="mt-6 hidden max-w-xl text-base leading-relaxed text-muted-foreground md:block">
                      {c.story}
                    </p>
                    <div className="hidden md:block">
                      <ExploreCollectionCta handle={c.handle} name={c.name} />
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
                      <ProductTile product={p} />
                    </Reveal>
                  ))}
                </div>

                <Reveal className="mt-16 text-center">
                  <Link
                    to={`/collections/${c.handle}`}
                    className="tracked inline-flex w-full items-center justify-center gap-3 px-10 py-4 font-medium transition hover:opacity-90 sm:w-auto"
                    style={{background: 'var(--accent)', color: 'var(--background)'}}
                  >
                    View All {c.name} <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                  </Link>
                </Reveal>
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
              <span className="tracked">Discover Our Story</span>
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

function JournalSection({posts}: {posts: JournalPost[]}) {
  const [featured, ...rest] = posts;
  if (!featured) return null;

  return (
    <section className="relative py-32 md:py-40">
      <div className="mx-auto max-w-[1600px] px-6 md:px-10">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <Reveal>
            <Eyebrow>Journal</Eyebrow>
            <h2
              className="font-display mt-6 text-4xl leading-[1.1] sm:text-5xl md:text-[3.5rem]"
              style={{fontWeight: 400}}
            >
              Stories of the
              <br />
              <span style={{fontStyle: 'italic'}}>Valley.</span>
            </h2>
          </Reveal>
          <Link
            to="/journal"
            className="tracked flex items-center gap-3 text-muted-foreground transition hover:text-accent"
          >
            View All Articles <ArrowRight className="h-3 w-3" strokeWidth={1} />
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-16 md:grid-cols-12">
          {featured && (
            <Reveal className="md:col-span-7">
              <Link to={`/journal/${featured.slug}`}>
                <div className="relative aspect-[5/4] w-full overflow-hidden">
                  <EditorialImage
                    src={featured.img}
                    alt={featured.title}
                    className="absolute inset-0 h-full w-full object-cover edge-fade-bottom"
                    sizes="(min-width: 768px) 58vw, 100vw"
                  />
                </div>
                <div className="mt-8">
                  <Eyebrow>
                    {featured.cat} · {featured.minutes} min read
                  </Eyebrow>
                  <h3
                    className="font-display mt-4 text-3xl leading-tight md:text-4xl"
                    style={{fontWeight: 400}}
                  >
                    {featured.title}
                  </h3>
                  <p className="mt-5 max-w-xl text-base text-muted-foreground">
                    {featured.excerpt}
                  </p>
                </div>
              </Link>
            </Reveal>
          )}

          <div className="flex flex-col gap-16 md:col-span-5">
            {rest.slice(0, 2).map((p, i) => (
              <Reveal key={p.slug} delay={i * 150}>
                <Link to={`/journal/${p.slug}`} className="grid grid-cols-5 gap-6">
                  <div className="relative col-span-2 aspect-[4/5] overflow-hidden">
                    <EditorialImage
                      src={p.img}
                      alt={p.title}
                      className="absolute inset-0 h-full w-full object-cover edge-fade-bottom"
                      sizes="120px"
                    />
                  </div>
                  <div className="col-span-3">
                    <Eyebrow>
                      {p.cat} · {p.minutes} min read
                    </Eyebrow>
                    <h4
                      className="font-display mt-3 text-xl leading-snug"
                      style={{fontWeight: 400}}
                    >
                      {p.title}
                    </h4>
                    <p className="mt-3 text-sm text-muted-foreground">{p.excerpt}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
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
          <Eyebrow>The The Kashmir Weaver Experience</Eyebrow>
          <h2
            className="font-display mx-auto mt-6 max-w-3xl text-4xl leading-[1.1] sm:text-5xl md:text-[3.5rem]"
            style={{fontWeight: 400}}
          >
            More than a purchase.
            <br />
            <span style={{fontStyle: 'italic'}}>A private acquaintance.</span>
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
            <span className="tracked">Speak With Our Concierge</span>
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
