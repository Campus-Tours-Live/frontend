import Image from "next/image";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Alert, Body, Link, SectionHeading } from "@/components/ui";
// Import directly from the server-safe module, not the "@/lib/auth" barrel —
// the barrel also re-exports the client-only authGate ('import "client-only"'),
// which a Server Component (this page) must not pull in.
import { sanitizeReturnTo } from "@/lib/auth/returnTo";
import { AuthOptions } from "@/components/signup/AuthOptions";

/**
 * Sign In — route "/signin" from design_new (#auth-flow).
 * Authentication is Google sign-in; AuthOptions redirects to the BFF which runs
 * the Google OAuth flow. Signing in and signing up are the same action.
 */
const TRUST = [
  "Verified current student guides",
  "Encrypted, password-free sign-in",
  "Sessions recorded for safety",
];

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const { error, returnTo } = await searchParams;
  const notRegistered = error === "not_registered";
  const authFailed = error === "auth_failed";
  // After sign-in, return to where the user was headed (set by middleware),
  // validated against the shared allowlist (defends against open redirect).
  const safeReturnTo = sanitizeReturnTo(returnTo);

  return (
    <main>
      <SiteHeader showAuthActions={false} />

      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-content items-center px-6 py-10">
        <div className="mx-auto grid w-full max-w-[1000px] grid-cols-1 overflow-hidden rounded-panel bg-card shadow-card lg:grid-cols-2 lg:items-stretch">
          {/* Small/medium: controlled-height banner (fills cleanly, centered on
              the students). A portrait image can't be both short and uncropped. */}
          <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] lg:hidden">
            <Image
              src="/assets/signin.png"
              alt="Student guides walking through a sunlit campus"
              fill
              sizes="100vw"
              priority
              // Waist-up crop (legs + most sky removed); slight zoom trims the
              // image's baked-in edge margin so no white shows at the corners.
              className="scale-105 object-cover object-[55%_70%]"
            />
          </div>

          {/* Large: flush image filling the left half of the card. */}
          <div className="relative hidden overflow-hidden lg:block">
            <Image
              src="/assets/signin.png"
              alt=""
              fill
              sizes="50vw"
              className="scale-105 object-cover object-center"
              priority
            />
          </div>

          <div className="flex flex-col justify-center gap-6 p-7 sm:gap-7 sm:p-10 lg:p-12">
            <SectionHeading
              eyebrow="Sign in"
              title="Welcome back"
              level={2}
              lead="Sign in to access your bookings, profile, and upcoming live tours."
              className="[&_p]:text-[16px]"
            />

            {notRegistered && (
              <Alert variant="error">
                We couldn&rsquo;t find an account for that Google account.{" "}
                <Link href="/signup/role" className="font-semibold underline">
                  Sign up first
                </Link>
                .
              </Alert>
            )}

            {authFailed && (
              <Alert variant="error">Sign-in didn&rsquo;t complete. Please try again.</Alert>
            )}

            <AuthOptions intent="signin" returnTo={safeReturnTo} />

            <ul className="flex flex-col gap-2.5 border-t border-border pt-6 text-[13px] text-ink-soft">
              {TRUST.map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-pill bg-sage-deep"
                    aria-hidden
                  />
                  {t}
                </li>
              ))}
            </ul>

            <Body size="large" color="muted" className="text-center">
              New to CampusToursLive?{" "}
              <Link href="/signup/role" className="font-semibold text-primary">
                Choose how to sign up
              </Link>
            </Body>
          </div>
        </div>
      </section>
    </main>
  );
}
