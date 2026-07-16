import Image from "next/image";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { Heading, Link, StatusBadge } from "@/components/ui";
import { AuthOptions } from "@/components/signup/AuthOptions";

/**
 * Sign Up · Participant — route "/signup/participant" from design_new (#auth-flow).
 *
 * Account creation for the PARTICIPANT role. Auth is delegated to Google sign-in
 * (run by the BFF); on return the BFF/Core provisions the account (one account ↔
 * one Google subject) and the user continues to /onboarding/participant.
 *
 * Layout mirrors /signin: one flush card — the image fills the left half on large
 * screens and becomes a controlled-height banner on small/medium screens.
 */
export default function SignupParticipantPage() {
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
              { label: "Participant" },
            ]}
          />
        </div>

        <div className="mx-auto grid w-full max-w-[1000px] grid-cols-1 overflow-hidden rounded-panel bg-card shadow-card lg:grid-cols-2 lg:items-stretch">
          {/* Small/medium: controlled-height banner (a portrait image can't be
              both short and uncropped). */}
          <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] lg:hidden">
            <Image
              src="/assets/participant_signup.png"
              alt="A student guide showing a prospective student around campus"
              fill
              sizes="100vw"
              priority
              // Waist-up crop; slight zoom trims the image's baked-in edge margin
              // so no white shows at the corners.
              className="scale-100 object-cover object-[40%_45%]"
            />
          </div>

          {/* Large: flush image filling the left half of the card. */}
          <div className="relative hidden overflow-hidden lg:block">
            <Image
              src="/assets/participant_signup.png"
              alt=""
              fill
              sizes="50vw"
              className="scale-105 object-cover object-center"
              priority
            />
          </div>

          <div className="flex flex-col justify-center gap-6 p-7 sm:gap-7 sm:p-10 lg:p-12">
            <div>
              <StatusBadge variant="info" className="self-start">
                Participant
              </StatusBadge>
              <Heading as="h1" size="h2" className="mt-3">
                Create your participant account
              </Heading>
              <p className="lead mt-3 text-[16px]">
                Explore and book live campus tours with verified student guides.
              </p>
            </div>

            <AuthOptions intent="signup" returnTo="/onboarding/participant" />

            <p className="text-center text-[12px] leading-relaxed text-ink-soft">
              By continuing you agree to the{" "}
              <Link href="#" className="font-semibold text-primary">
                Terms of Service
              </Link>{" "}
              and acknowledge the{" "}
              <Link href="#" className="font-semibold text-primary">
                Privacy Policy
              </Link>
              . Under-16 users cannot self-register.
            </p>

            <p className="border-t border-border pt-6 text-center text-[13px] text-ink-soft">
              Already have an account?{" "}
              <Link href="/signin" className="font-semibold text-primary">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
