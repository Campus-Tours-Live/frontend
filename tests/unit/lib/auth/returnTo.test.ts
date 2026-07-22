import { DEFAULT_RETURN_TO, sanitizeReturnTo } from "@/lib/auth/returnTo";

describe("DEFAULT_RETURN_TO", () => {
  it("is the dashboard path", () => {
    expect(DEFAULT_RETURN_TO).toBe("/dashboard");
  });
});

describe("sanitizeReturnTo", () => {
  describe("allowed roots pass through", () => {
    it.each(["/dashboard", "/profile", "/support", "/staff", "/onboarding", "/guide"])(
      "returns %s unchanged",
      (value) => {
        expect(sanitizeReturnTo(value)).toBe(value);
      },
    );
  });

  describe("allowed subpaths pass through", () => {
    it.each([
      "/dashboard/bookings",
      "/profile/settings",
      "/support/tickets/42",
      "/staff/users",
      "/onboarding/step-1",
      "/dashboard/a/b/c/deeply/nested",
      "/guide/availability",
      "/guide/tour-offerings/new",
    ])("returns %s unchanged", (value) => {
      expect(sanitizeReturnTo(value)).toBe(value);
    });
  });

  describe("values with query/hash keep the full value but match on pathname", () => {
    it.each([
      "/dashboard?x=1",
      "/profile#a",
      "/dashboard/bookings?tab=upcoming&page=2",
      "/support#section",
      "/onboarding?role=guide#top",
      "/staff?q=",
    ])("returns %s unchanged when the pathname is allowed", (value) => {
      expect(sanitizeReturnTo(value)).toBe(value);
    });

    it("rejects a non-allowlisted pathname even with query string", () => {
      expect(sanitizeReturnTo("/evil?x=1")).toBe(DEFAULT_RETURN_TO);
    });

    it("rejects a non-allowlisted pathname even with hash", () => {
      expect(sanitizeReturnTo("/admin#section")).toBe(DEFAULT_RETURN_TO);
    });

    it("uses the hash to delimit the pathname (root + #)", () => {
      // "/dashboard#evil" → pathname "/dashboard" is allowed
      expect(sanitizeReturnTo("/dashboard#evil")).toBe("/dashboard#evil");
    });

    it("does not treat query content as part of the pathname", () => {
      // pathname is "/dashboard", the "/evil" only lives in the query string
      expect(sanitizeReturnTo("/dashboard?next=/evil")).toBe("/dashboard?next=/evil");
    });
  });

  describe("empty / nullish values fall back to default", () => {
    it.each([
      ["empty string", ""],
      ["undefined", undefined],
      ["null", null],
    ])("returns default for %s", (_label, value) => {
      expect(sanitizeReturnTo(value as string | null | undefined)).toBe(DEFAULT_RETURN_TO);
    });
  });

  describe("values not starting with '/' fall back to default", () => {
    it.each([
      "dashboard",
      "profile/settings",
      "relative/path",
      "?x=1",
      "#hash",
      " ",
      " /dashboard",
    ])("returns default for %s", (value) => {
      expect(sanitizeReturnTo(value)).toBe(DEFAULT_RETURN_TO);
    });
  });

  describe("open-redirect tricks fall back to default", () => {
    it("rejects protocol-relative //evil.com", () => {
      expect(sanitizeReturnTo("//evil.com")).toBe(DEFAULT_RETURN_TO);
    });

    it("rejects protocol-relative //evil.com/dashboard", () => {
      expect(sanitizeReturnTo("//evil.com/dashboard")).toBe(DEFAULT_RETURN_TO);
    });

    it("rejects backslash \\evil", () => {
      expect(sanitizeReturnTo("\\evil")).toBe(DEFAULT_RETURN_TO);
    });

    it("rejects mixed slash/backslash /\\evil.com", () => {
      expect(sanitizeReturnTo("/\\evil.com")).toBe(DEFAULT_RETURN_TO);
    });

    it("rejects backslash embedded after an allowed root", () => {
      expect(sanitizeReturnTo("/dashboard\\evil")).toBe(DEFAULT_RETURN_TO);
    });

    it("rejects absolute https URL", () => {
      expect(sanitizeReturnTo("https://x")).toBe(DEFAULT_RETURN_TO);
    });

    it("rejects absolute http URL to an allowed-looking path", () => {
      expect(sanitizeReturnTo("https://evil.com/dashboard")).toBe(DEFAULT_RETURN_TO);
    });

    it.each(["javascript://alert(1)", "/dashboard://evil", "ftp://host"])(
      "rejects any value containing '://' (%s)",
      (value) => {
        expect(sanitizeReturnTo(value)).toBe(DEFAULT_RETURN_TO);
      },
    );
  });

  describe("non-allowlisted roots fall back to default", () => {
    it.each([
      "/evil",
      "/admin",
      "/api/logout",
      "/dashboardx",
      "/profiles",
      "/staffing",
      "/onboard",
      "/",
    ])("returns default for %s", (value) => {
      expect(sanitizeReturnTo(value)).toBe(DEFAULT_RETURN_TO);
    });

    it("does not match a root as a prefix without a path separator", () => {
      // "/dashboardx" starts with "/dashboard" but is not "/dashboard" or "/dashboard/..."
      expect(sanitizeReturnTo("/dashboardx")).toBe(DEFAULT_RETURN_TO);
    });
  });

  describe("case sensitivity", () => {
    it.each(["/Dashboard", "/PROFILE", "/Support", "/Onboarding/Step"])(
      "treats %s (wrong case) as non-allowlisted",
      (value) => {
        expect(sanitizeReturnTo(value)).toBe(DEFAULT_RETURN_TO);
      },
    );
  });
});
