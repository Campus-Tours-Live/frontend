/**
 * Auth layout — sign-in, sign-up, and onboarding. Deliberately renders NO header
 * (no brand bar, no tours search): these pages are a focused, distraction-free
 * funnel, and each provides its own in-content branding / breadcrumb / Cancel.
 * The full-height <main> lets pages center their card against the viewport.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-dvh bg-background">{children}</main>;
}
