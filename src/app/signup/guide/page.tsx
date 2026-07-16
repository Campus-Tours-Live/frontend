import Image from "next/image";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { Body, Caption, Heading, Link, StatusBadge } from "@/components/ui";
import { AuthOptions } from "@/components/signup/AuthOptions";

/**
 * Sign Up · Guide — route "/signup/guide" from design_new (#auth-flow).
 *
 * Account creation for the GUIDE (supply-side) role. Auth is delegated to Google
 * sign-in (run by the BFF); on return the BFF/Core provisions the account and the
 * user continues to /onboarding/guide to complete their application + verification.
 *
 * Layout mirrors /signup/participant and /signin: one flush card — the image
 * fills the left half on large screens and becomes a banner on small/medium.
 */
export default function SignupGuidePage() {
  return (
    <main>
      <SiteHeader showAuthActions={false} />

      <section className="relative mx-auto flex min-h-[calc(100vh-73px)] max-w-content items-center px-6 py-10">
        {/* Breadcrumb floats at the top so the card stays centered like /signin. */}
        <div className="absolute inset-x-6 top-6">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Sign up", href: "/signup/role" },
              { label: "Guide" },
            ]}
          />
        </div>

        <div className="mx-auto grid w-full max-w-[1000px] grid-cols-1 overflow-hidden rounded-panel bg-card shadow-card lg:grid-cols-2 lg:items-stretch">
          {/* Small/medium: controlled-height banner. */}
          <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] lg:hidden">
            <Image
              src="/assets/guide_signup.png"
              alt="A student guide leading a live campus tour"
              fill
              sizes="100vw"
              priority
              className="scale-105 object-cover object-[55%_70%]"
            />
          </div>

          {/* Large: flush image filling the left half of the card. */}
          <div className="relative hidden overflow-hidden lg:block">
            <Image
              src="/assets/guide_signup.png"
              alt=""
              fill
              sizes="50vw"
              className="scale-105 object-cover object-center"
              priority
            />
          </div>

          <div className="flex flex-col justify-center gap-6 p-7 sm:gap-7 sm:p-10 lg:p-12">
            <div>
              <StatusBadge variant="warning" className="self-start">
                Guide application
              </StatusBadge>
              <Heading as="h1" size="h2" className="mt-3">
                Apply to become a guide
              </Heading>
              <Body size="lead" color="muted" weight={500} className="mt-3">
                Share your campus with future students and earn from live, paid tours. Open to
                current university students.
              </Body>
            </div>

            <AuthOptions intent="signup" returnTo="/onboarding/guide" />

            <Caption as="p" className="text-center leading-relaxed">
              By continuing you agree to the{" "}
              <Link href="#" className="font-semibold text-primary">
                Terms of Service
              </Link>{" "}
              and acknowledge the{" "}
              <Link href="#" className="font-semibold text-primary">
                Privacy Policy
              </Link>
              . Verification of current student status is required before your tours can be listed.
            </Caption>

            <Body size="small" color="muted" className="border-t border-border pt-6 text-center">
              Already have an account?{" "}
              <Link href="/signin" className="font-semibold text-primary">
                Sign in
              </Link>
            </Body>
          </div>
        </div>
      </section>
    </main>
  );
}
