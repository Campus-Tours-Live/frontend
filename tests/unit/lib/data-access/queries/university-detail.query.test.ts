import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";
import { universityDetailOptions } from "@/lib/data-access/queries/university-detail.query";

jest.mock("@/lib/data-access/http", () => ({
  apiJson: jest.fn(),
}));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("universityDetailOptions", () => {
  it("uses the universityDetail queryKey", () => {
    expect(universityDetailOptions("duke").queryKey).toEqual(queryKeys.universityDetail("duke"));
    expect(universityDetailOptions("duke").queryKey).toEqual(["university-detail", "duke"]);
  });

  it("is disabled when the slug is empty", () => {
    expect(universityDetailOptions("").enabled).toBe(false);
    expect(universityDetailOptions("duke").enabled).toBe(true);
  });

  it("queryFn fetches /v1/universities/{slug} as an anonymous read", async () => {
    const payload = { slug: "duke", name: "Duke University", tourCount: 60 };
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = universityDetailOptions("duke").queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledWith("/v1/universities/duke", { escalate: "none" });
    expect(result).toBe(payload);
  });

  it("queryFn encodes the slug into the path", async () => {
    mockedApiJson.mockResolvedValue({} as never);

    const queryFn = universityDetailOptions("a b/c").queryFn as () => Promise<unknown>;
    await queryFn();

    expect(mockedApiJson).toHaveBeenCalledWith("/v1/universities/a%20b%2Fc", {
      escalate: "none",
    });
  });
});
