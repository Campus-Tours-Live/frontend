import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Link } from "@/components/ui/link/Link";

/**
 * next/link renders a plain <a> in the DOM regardless, so we distinguish
 * client-routed links from full-nav links by mocking next/link with a marker
 * data attribute. A plain <a> (full nav) will NOT carry the marker.
 */
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} data-nextlink="true" {...props}>
      {children}
    </a>
  ),
}));

function isClientLink(el: HTMLElement) {
  return el.getAttribute("data-nextlink") === "true";
}

describe("Link — routing decision", () => {
  it("uses client (next/link) for internal routes", () => {
    render(<Link href="/dashboard">Dash</Link>);
    expect(isClientLink(screen.getByRole("link"))).toBe(true);
  });

  it.each([
    "https://example.com",
    "//cdn.example.com/x",
    "/auth/login",
    "/api/me",
    "/v1/tours",
    "mailto:hi@x.com",
    "tel:+15551234",
    "#section",
  ])("renders a full-page <a> for %s", (href) => {
    render(<Link href={href}>x</Link>);
    expect(isClientLink(screen.getByRole("link"))).toBe(false);
  });

  it("external=true forces a plain <a> even for an internal route", () => {
    render(
      <Link href="/dashboard" external>
        Dash
      </Link>,
    );
    expect(isClientLink(screen.getByRole("link"))).toBe(false);
  });

  it("external=false forces next/link even for an absolute-looking nav rule", () => {
    render(
      <Link href="/auth/login" external={false}>
        Login
      </Link>,
    );
    expect(isClientLink(screen.getByRole("link"))).toBe(true);
  });
});

describe("Link — styling", () => {
  it("applies button classes when a variant is set", () => {
    render(
      <Link href="/x" variant="primary" size="large" block>
        Go
      </Link>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveClass("btn", "btn-primary", "btn-lg", "btn-block");
  });

  it("leaves className undefined for a plain text link (no variant, no className)", () => {
    render(<Link href="/x">Plain</Link>);
    expect(screen.getByRole("link")).not.toHaveAttribute("class");
  });

  it("still applies a custom className without a variant", () => {
    render(
      <Link href="/x" className="text-link">
        Plain
      </Link>,
    );
    expect(screen.getByRole("link")).toHaveClass("text-link");
    expect(screen.getByRole("link")).not.toHaveClass("btn");
  });

  it("forwards href and a ref", () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <Link href="https://example.com" ref={ref}>
        ext
      </Link>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
  });
});
