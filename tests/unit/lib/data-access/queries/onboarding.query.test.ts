import { onboardingOptions } from "@/lib/data-access/queries/onboarding.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("onboardingOptions", () => {
  it.each(["guide", "participant"] as const)("uses the onboarding queryKey for role %s", (role) => {
    expect(onboardingOptions(role).queryKey).toEqual(queryKeys.onboarding(role));
    expect(onboardingOptions(role).queryKey).toEqual(["onboarding", role]);
  });

  it.each(["guide", "participant"] as const)(
    "queryFn fetches /v1/onboarding with role=%s in the path",
    async (role) => {
      const payload = { role };
      mockedApiJson.mockResolvedValue(payload as never);

      const queryFn = onboardingOptions(role).queryFn as () => Promise<unknown>;
      const result = await queryFn();

      expect(mockedApiJson).toHaveBeenCalledTimes(1);
      expect(mockedApiJson).toHaveBeenCalledWith(`/v1/onboarding?role=${role}`);
      expect(result).toBe(payload);
    },
  );
});
