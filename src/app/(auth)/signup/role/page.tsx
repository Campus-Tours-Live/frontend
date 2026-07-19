import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { Alert, Body, Container, SectionHeading } from "@/components/ui";
import { RoleCard, type RoleCardProps } from "@/components/signup/RoleCard";
import { getServerMe } from "@/lib/http/serverMe";

/**
 * Sign Up · Role — route "/signup/role" from design_new (#role).
 * Pick account role before authentication. Content hardcoded; the role CTAs are
 * inert placeholders (auth flow not wired yet).
 */
const ROLES: RoleCardProps[] = [
  {
    image: "/assets/participant.png",
    imageAlt: "Participant onboarding illustration",
    badge: "Participant",
    badgeVariant: "info",
    title: "Explore and book live campus tours",
    subtitle: "For prospective students, parents, and transfer or international students.",
    points: [
      "Prospective students",
      "Parents and guardians",
      "Transfer and international students",
    ],
    cta: "Continue as participant",
    ctaVariant: "primary",
    ctaHref: "/signup/participant",
  },
  {
    image: "/assets/guide.png",
    imageAlt: "Guide application illustration",
    badge: "Guide application",
    badgeVariant: "warning",
    title: "Share your campus with future students",
    subtitle: "Apply to deliver paid live tours as a verified student guide.",
    points: [
      "Current university students only",
      "Verification is required before public listing",
      "Set availability, pricing, and tour topics",
    ],
    cta: "Apply to become a guide",
    ctaVariant: "secondary",
    ctaHref: "/signup/guide",
  },
];

export default async function SignupRolePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // A logged-in member (holds ≥1 role) doesn't pick a role here — they acquire a
  // second role via the in-app "Become X" onboarding, not the signup funnel. A bare
  // account (signed in, 0 roles, mid first-signup) is allowed: this is where it picks
  // its first role. (Role-aware → must be the RSC guard; proxy can't read roles.)
  const me = await getServerMe();
  if ((me?.roles?.length ?? 0) > 0) redirect("/dashboard");

  const { error } = await searchParams;
  const parentNoGuide = error === "parent_no_guide";
  const completeSignup = error === "complete_signup";
  return (
    <Container as="section" className="pb-24 pt-10">
      <div className="mb-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Sign up" }]} />
      </div>

      {parentNoGuide && (
        <Alert variant="error" className="mx-auto mb-8 max-w-[680px]">
          Parent or guardian accounts can&rsquo;t become guides. You can continue as a participant.
        </Alert>
      )}

      {completeSignup && (
        <Alert variant="error" className="mx-auto mb-8 max-w-[680px]">
          You haven&rsquo;t finished setting up your account yet. Choose how you&rsquo;d like to
          join to continue.
        </Alert>
      )}

      <SectionHeading
        align="center"
        eyebrow="Choose your path"
        title="How would you like to use CampusToursLive?"
        lead="You can explore and book as a participant, or apply to become a verified student guide."
        className="mx-auto max-w-[680px]"
      />

      <div className="mx-auto mt-10 grid max-w-[1040px] grid-cols-1 gap-6 md:grid-cols-2">
        {ROLES.map((role) => (
          <RoleCard key={role.badge} {...role} />
        ))}
      </div>

      <Body size="small" color="muted" className="mx-auto mt-8 max-w-[680px] text-center">
        Under 16 users cannot self-register. Participants aged 16–17 require guardian consent and
        live supervision.
      </Body>
    </Container>
  );
}
