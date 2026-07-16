import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
jest.mock("@/lib/http/serverMe", () => ({ getServerMe: jest.fn() }));
// Stub the heavy chrome so the test focuses on the guard + error alerts.
jest.mock("@/components/site/SiteHeader", () => ({
  SiteHeader: () => <div data-testid="header" />,
}));
jest.mock("@/components/site/Breadcrumb", () => ({
  Breadcrumb: () => <nav data-testid="crumb" />,
}));
jest.mock("@/components/signup/RoleCard", () => ({
  RoleCard: ({ badge }: { badge: string }) => <div data-testid="role-card">{badge}</div>,
}));

import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";
import SignupRolePage from "@/app/signup/role/page";

const redirectMock = redirect as unknown as jest.Mock;
const getServerMeMock = getServerMe as jest.Mock;

beforeEach(() => {
  redirectMock.mockClear();
  getServerMeMock.mockReset();
});

async function renderPage(
  search: { error?: string } = {},
  me: unknown = { roles: [] },
): Promise<void> {
  getServerMeMock.mockResolvedValue(me);
  const el = await SignupRolePage({ searchParams: Promise.resolve(search) });
  render(el);
}

describe("/signup/role page", () => {
  it("redirects a member who already holds a role to /dashboard", async () => {
    getServerMeMock.mockResolvedValue({ roles: ["PARTICIPANT"] });
    await expect(SignupRolePage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
  });

  it("renders the role chooser for a bare account (0 roles, no error)", async () => {
    await renderPage({}, { roles: [] });
    expect(screen.getByText(/how would you like to use/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("role-card")).toHaveLength(2);
    expect(screen.queryByText(/can.t become guides/i)).not.toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("shows the parent_no_guide error alert", async () => {
    await renderPage({ error: "parent_no_guide" }, { roles: [] });
    expect(screen.getByText(/can.t become guides/i)).toBeInTheDocument();
  });

  it("shows the complete_signup error alert", async () => {
    await renderPage({ error: "complete_signup" }, { roles: [] });
    expect(screen.getByText(/finished setting up/i)).toBeInTheDocument();
  });
});
