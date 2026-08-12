import {WhatsAppIcon} from '~/components/gulriza/WhatsAppIcon';

type ProductWhatsAppCtaProps = {
  href: string;
  label: string;
  /** Primary fills the ATC slot; secondary sits near the gallery. */
  variant?: 'primary' | 'secondary';
  className?: string;
};

export function ProductWhatsAppCta({
  href,
  label,
  variant = 'primary',
  className = '',
}: ProductWhatsAppCtaProps) {
  if (variant === 'secondary') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`tracked group inline-flex min-h-11 items-center justify-center gap-2.5 px-3 text-muted-foreground transition hover:text-accent active:opacity-80 touch-manipulation ${className}`.trim()}
      >
        <WhatsAppIcon className="h-4 w-4 shrink-0 opacity-80 transition group-hover:opacity-100" />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex w-full items-center justify-center gap-2.5 py-3.5 tracked transition hover:opacity-90 touch-manipulation ${className}`.trim()}
      style={{
        background: 'var(--accent)',
        color: 'var(--background)',
      }}
    >
      <WhatsAppIcon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </a>
  );
}
