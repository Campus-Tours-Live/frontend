import { render, screen } from "@testing-library/react";

// redirect() throws in real Next (halting render); mock it to throw a sentinel so
// we can both assert the target and that control stops there.
jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
jest.mock("@/lib/http/serverMe", () => ({ getServerMe: jest.fn() }));
jest.mock("@/components/site/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="appshell">{children}</div>
  ),
}));

import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";
import AppGroupLayout from "@/app/(app)/layout";
import { pendingMe, provisionedMe } from "../../support/meFixtures";

const redirectMock = redirect as unknown as jest.Mock;
const getServerMeMock = getServerMe as jest.Mock;

beforeEach(() => {
  redirectMock.mockClear();
  getServerMeMock.mockReset();
});

describe("(app) layout guard", () => {
  it("redirects to /signup/role when there is no session", async () => {
    getServerMeMock.mockResolvedValue(null);
    await expect(AppGroupLayout({ children: null })).rejects.toThrow("REDIRECT:/signup/role");
    expect(redirectMock).toHaveBeenCalledWith("/signup/role");
  });

  it("CTL-97: redirects a PendingMe (signed in, not yet provisioned) to /signup/role", async () => {
    getServerMeMock.mockResolvedValue(pendingMe());
    await expect(AppGroupLayout({ children: null })).rejects.toThrow("REDIRECT:/signup/role");
    expect(redirectMock).toHaveBeenCalledWith("/signup/role");
  });

  it("redirects a staff-only account to /staff", async () => {
    getServerMeMock.mockResolvedValue(provisionedMe({ roles: ["ADMIN"], currentRole: null }));
    await expect(AppGroupLayout({ children: null })).rejects.toThrow("REDIRECT:/staff");
    expect(redirectMock).toHaveBeenCalledWith("/staff");
  });

  it("renders AppShell for a consumer role (no redirect)", async () => {
    getServerMeMock.mockResolvedValue(
      provisionedMe({ roles: ["PARTICIPANT"], currentRole: "PARTICIPANT" }),
    );
    const el = await AppGroupLayout({ children: <span>kids</span> });
    render(el);
    expect(screen.getByTestId("appshell")).toBeInTheDocument();
    expect(screen.getByText("kids")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /signup/role when a held role has no ACTIVE role yet (rare multi-role case)", async () => {
    getServerMeMock.mockResolvedValue(
      provisionedMe({ roles: ["PARTICIPANT", "GUIDE"], currentRole: null }),
    );
    await expect(AppGroupLayout({ children: null })).rejects.toThrow("REDIRECT:/signup/role");
    expect(redirectMock).toHaveBeenCalledWith("/signup/role");
  });
});
