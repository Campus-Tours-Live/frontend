import { SectionHeading, Link } from "@/components/ui";

/**
 * Global 404 — catches any unmatched route. Next.js renders this inside the
 * root layout (no nested route-group layout/header).
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <SectionHeading
        align="center"
        eyebrow="404"
        title="Page not found"
        lead="The page you're looking for doesn't exist or may have moved."
      />
      <Link href="/" variant="primary">
        Back to home
      </Link>
    </div>
  );
}
