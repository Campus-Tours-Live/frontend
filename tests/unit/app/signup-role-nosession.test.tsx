import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
jest.mock("@/lib/http/serverMe", () => ({ getServerMe: jest.fn() }));
jest.mock("@/components/site/SiteHeader", () => ({ SiteHeader: () => <div /> }));
jest.mock("@/components/site/Breadcrumb", () => ({ Breadcrumb: () => <nav /> }));
jest.mock("@/components/signup/RoleCard", () => ({
  RoleCard: () => <div data-testid="role-card" />,
}));

import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";
import SignupRolePage from "@/app/(auth)/signup/role/page";

describe("/signup/role with no session", () => {
  it("renders the chooser (no redirect) when getServerMe returns null", async () => {
    (getServerMe as jest.Mock).mockResolvedValue(null);
    const el = await SignupRolePage({ searchParams: Promise.resolve({}) });
    render(el);
    expect(screen.getAllByTestId("role-card").length).toBeGreaterThan(0);
    expect(redirect).not.toHaveBeenCalled();
  });
});
