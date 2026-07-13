import { tourCatalogOptions, tourDetailOptions } from "@/lib/data-access/queries/tours.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("tourCatalogOptions", () => {
  it("uses the tourCatalog queryKey", () => {
    const filters = { sort: "PRICE_ASC" as const, limit: 10 };
    expect(tourCatalogOptions(filters).queryKey).toEqual(queryKeys.tourCatalog(filters));
    expect(tourCatalogOptions(filters).queryKey).toEqual(["tour-catalog", filters]);
  });

  it("queryFn fetches /v1/tours with no query string when filters are empty", async () => {
    const payload = [{ id: "t1" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = tourCatalogOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/tours");
    expect(result).toBe(payload);
  });

  it("queryFn builds the query string from filters", async () => {
    mockedApiJson.mockResolvedValue([] as never);

    const filters = {
      universityId: "u1",
      topic: "GENERAL_CAMPUS",
      q: "campus",
      sort: "RATING" as const,
      limit: 5,
    };
    const queryFn = tourCatalogOptions(filters).queryFn as () => Promise<unknown>;
    await queryFn();

    expect(mockedApiJson).toHaveBeenCalledWith(
      "/v1/tours?universityId=u1&topic=GENERAL_CAMPUS&q=campus&sort=RATING&limit=5",
    );
  });
});

describe("tourDetailOptions", () => {
  it("uses the tourDetail queryKey", () => {
    expect(tourDetailOptions("abc").queryKey).toEqual(queryKeys.tourDetail("abc"));
    expect(tourDetailOptions("abc").queryKey).toEqual(["tour-detail", "abc"]);
  });

  it("is disabled when id is empty", () => {
    expect(tourDetailOptions("").enabled).toBe(false);
    expect(tourDetailOptions("abc").enabled).toBe(true);
  });

  it("queryFn fetches /v1/tours/{id} and returns the resolved value", async () => {
    const payload = { id: "abc", title: "Campus tour" };
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = tourDetailOptions("abc").queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/tours/abc");
    expect(result).toBe(payload);
  });
});
