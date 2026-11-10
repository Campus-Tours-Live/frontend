import { languagesOptions } from "@/lib/data-access/queries/languages.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("languagesOptions", () => {
  it("uses the languages queryKey", () => {
    expect(languagesOptions().queryKey).toEqual(queryKeys.languages());
    expect(languagesOptions().queryKey).toEqual(["languages"]);
  });

  it("never goes stale within a session (staleTime: Infinity)", () => {
    expect(languagesOptions().staleTime).toBe(Infinity);
  });

  it("queryFn fetches /v1/meta/languages with escalate: none and returns the resolved value", async () => {
    const payload = [{ value: "en-US", label: "English" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = languagesOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/meta/languages", { escalate: "none" });
    expect(result).toBe(payload);
  });
});
