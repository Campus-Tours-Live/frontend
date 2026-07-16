import Image from "next/image";
import { Body, Button, Heading, Icon, Link, List, ListItem, StatusBadge } from "@/components/ui";

/**
 * RoleCard — signup-flow component (used by /signup/role).
 * Composes the UI primitives (Card-like surface, StatusBadge, Button/Link); it is
 * feature-specific (only the signup flow uses it), so it lives under
 * components/signup rather than a global common folder.
 */
export interface RoleCardProps {
  image: string;
  imageAlt: string;
  badge: string;
  badgeVariant: "info" | "warning" | "success";
  title: string;
  subtitle: string;
  points: string[];
  cta: string;
  ctaVariant: "primary" | "secondary";
  /** If set, the CTA navigates here; otherwise it's an inert button. */
  ctaHref?: string;
}

export function RoleCard({
  image,
  imageAlt,
  badge,
  badgeVariant,
  title,
  subtitle,
  points,
  cta,
  ctaVariant,
  ctaHref,
}: RoleCardProps) {
  return (
    <article className="card flex flex-col p-[30px] transition-all duration-200 hover:-translate-y-[3px] hover:border-sage hover:shadow-[0_14px_34px_rgba(47,52,55,0.09)]">
      {/* Editorial illustration. Box tracks the asset's native 3:1 ratio, so
          object-cover fills it with no cropping at any screen size. */}
      <div className="relative mb-[22px] aspect-[3/1] w-full overflow-hidden rounded-[14px] bg-canvas">
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 500px"
          className="object-cover object-center"
        />
      </div>

      <StatusBadge variant={badgeVariant} className="self-start">
        {badge}
      </StatusBadge>
      <Heading as="h2" size="h3" className="mb-1.5 mt-4">
        {title}
      </Heading>
      <Body size="medium" color="muted">
        {subtitle}
      </Body>

      <List dividers={false} className="mt-4 flex min-h-[90px] flex-col gap-2">
        {points.map((point) => (
          <ListItem
            key={point}
            className="items-start gap-2 px-0 py-0"
            leading={<Icon name="success" className="mt-0.5 text-sage-deep" />}
          >
            {point}
          </ListItem>
        ))}
      </List>

      <div className="mt-auto pt-2">
        {ctaHref ? (
          <Link href={ctaHref} variant={ctaVariant} block>
            {cta}
          </Link>
        ) : (
          <Button variant={ctaVariant} block>
            {cta}
          </Button>
        )}
      </div>
    </article>
  );
}
