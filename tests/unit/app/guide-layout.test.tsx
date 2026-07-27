import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
jest.mock("@/lib/http/serverMe", () => ({ getServerMe: jest.fn() }));

import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";
import GuideLayout from "@/app/(app)/guide/layout";

const redirectMock = redirect as unknown as jest.Mock;
const getServerMeMock = getServerMe as jest.Mock;

beforeEach(() => {
  redirectMock.mockClear();
  getServerMeMock.mockReset();
});

describe("/guide layout guard", () => {
  it("redirects when there is no session", async () => {
    getServerMeMock.mockResolvedValue(null);
    await expect(GuideLayout({ children: null })).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("redirects a participant-only member to /dashboard", async () => {
    getServerMeMock.mockResolvedValue({ roles: ["PARTICIPANT"], currentRole: "PARTICIPANT" });
    await expect(GuideLayout({ children: null })).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("redirects a guide whose active role is participant to /dashboard", async () => {
    getServerMeMock.mockResolvedValue({
      roles: ["GUIDE", "PARTICIPANT"],
      currentRole: "PARTICIPANT",
    });
    await expect(GuideLayout({ children: null })).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("renders children for an active guide (no redirect)", async () => {
    getServerMeMock.mockResolvedValue({ roles: ["GUIDE"], currentRole: "GUIDE" });
    const el = await GuideLayout({ children: <span data-testid="kids" /> });
    render(el);
    expect(screen.getByTestId("kids")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
