import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
jest.mock("@/lib/http/serverMe", () => ({ getServerMe: jest.fn() }));

import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";
import StaffLayout from "@/app/staff/layout";
import { pendingMe, provisionedMe } from "../../support/meFixtures";

const redirectMock = redirect as unknown as jest.Mock;
const getServerMeMock = getServerMe as jest.Mock;

beforeEach(() => {
  redirectMock.mockClear();
  getServerMeMock.mockReset();
});

describe("/staff layout guard", () => {
  it("redirects an unauthenticated visitor to signin (returnTo=/staff)", async () => {
    getServerMeMock.mockResolvedValue(null);
    await expect(StaffLayout({ children: null })).rejects.toThrow(
      "REDIRECT:/signin?returnTo=/staff",
    );
    expect(redirectMock).toHaveBeenCalledWith("/signin?returnTo=/staff");
  });

  it("CTL-97: redirects a PendingMe (signed in, not yet provisioned) to /signup/role", async () => {
    getServerMeMock.mockResolvedValue(pendingMe());
    await expect(StaffLayout({ children: null })).rejects.toThrow("REDIRECT:/signup/role");
  });

  it("redirects a non-staff member to /dashboard", async () => {
    getServerMeMock.mockResolvedValue(provisionedMe({ roles: ["PARTICIPANT"] }));
    await expect(StaffLayout({ children: null })).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("renders children for an admin (no redirect)", async () => {
    getServerMeMock.mockResolvedValue(provisionedMe({ roles: ["ADMIN"], currentRole: null }));
    const el = await StaffLayout({ children: <span data-testid="kids" /> });
    render(el);
    expect(screen.getByTestId("kids")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("renders children for support", async () => {
    getServerMeMock.mockResolvedValue(provisionedMe({ roles: ["SUPPORT"], currentRole: null }));
    const el = await StaffLayout({ children: <span data-testid="kids" /> });
    render(el);
    expect(screen.getByTestId("kids")).toBeInTheDocument();
  });
});
