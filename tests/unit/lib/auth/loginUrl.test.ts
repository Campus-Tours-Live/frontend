import { buildLoginUrl } from "@/lib/auth/loginUrl";

describe("buildLoginUrl", () => {
  it("defaults intent to signin and omits role when not given", () => {
    const url = buildLoginUrl({ returnTo: "/dashboard" });
    expect(url).toBe("/auth/login?returnTo=%2Fdashboard&intent=signin");
  });

  it("includes an explicit intent", () => {
    const url = buildLoginUrl({ returnTo: "/onboarding/guide", intent: "signup" });
    expect(url).toContain("intent=signup");
  });

  it("includes role= when the target role is known", () => {
    const url = buildLoginUrl({ returnTo: "/onboarding/guide", intent: "signup", role: "GUIDE" });
    expect(url).toBe("/auth/login?returnTo=%2Fonboarding%2Fguide&intent=signup&role=GUIDE");
  });

  it("includes role=PARTICIPANT for the participant entry", () => {
    const url = buildLoginUrl({
      returnTo: "/onboarding/participant",
      intent: "signup",
      role: "PARTICIPANT",
    });
    expect(url).toContain("role=PARTICIPANT");
  });
});
