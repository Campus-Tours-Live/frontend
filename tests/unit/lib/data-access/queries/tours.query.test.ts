import {
  tourCatalogOptions,
  tourDetailOptions,
  toursPath,
} from "@/lib/data-access/queries/tours.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("toursPath", () => {
  it("emits one repeated topic param per id, in order", () => {
    expect(toursPath({ topicIds: ["GENERAL_CAMPUS", "DORM_HOUSING"] })).toBe(
      "/v1/tours?topic=GENERAL_CAMPUS&topic=DORM_HOUSING",
    );
  });

  it("omits topic when empty/undefined", () => {
    expect(toursPath({ topicIds: [] })).toBe("/v1/tours");
    expect(toursPath({})).toBe("/v1/tours");
  });

  it("defaults filters to {} when called with no argument", () => {
    expect(toursPath()).toBe("/v1/tours");
  });
});

describe("tourCatalogOptions", () => {
  it("uses the tourCatalog queryKey", () => {
    const filters = { sort: "PRICE_ASC" as const, limit: 10 };
    expect(tourCatalogOptions(filters).queryKey).toEqual(queryKeys.tourCatalog(filters));
    expect(tourCatalogOptions(filters).queryKey).toEqual(["tour-catalog", filters]);
  });

  it("marks catalog reads as ambient so public browsing does not trigger re-auth UI", () => {
    const queryFn = tourCatalogOptions().queryFn as () => Promise<unknown>;

    mockedApiJson.mockResolvedValue([] as never);
    void queryFn();

    expect(mockedApiJson).toHaveBeenCalledWith("/v1/tours", { escalate: "none" });
  });

  it("queryFn fetches /v1/tours with no query string when filters are empty", async () => {
    const payload = [{ id: "t1" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = tourCatalogOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/tours", { escalate: "none" });
    expect(result).toBe(payload);
  });

  it("queryFn builds the query string from filters", async () => {
    mockedApiJson.mockResolvedValue([] as never);

    const filters = {
      universityId: "u1",
      topicIds: ["GENERAL_CAMPUS", "DORM_HOUSING"],
      q: "campus",
      sort: "RATING" as const,
      limit: 5,
    };
    const queryFn = tourCatalogOptions(filters).queryFn as () => Promise<unknown>;
    await queryFn();

    expect(mockedApiJson).toHaveBeenCalledWith(
      "/v1/tours?universityId=u1&topic=GENERAL_CAMPUS&topic=DORM_HOUSING&q=campus&sort=RATING&limit=5",
      { escalate: "none" },
    );
  });

  it("queryFn omits limit when it is 0", async () => {
    mockedApiJson.mockResolvedValue([] as never);

    const queryFn = tourCatalogOptions({ limit: 0 }).queryFn as () => Promise<unknown>;
    await queryFn();

    expect(mockedApiJson).toHaveBeenCalledWith("/v1/tours", { escalate: "none" });
  });

  it("adds page when > 0 and omits it when 0", async () => {
    mockedApiJson.mockResolvedValue({} as never);

    const withPage = tourCatalogOptions({ page: 2, limit: 20 }).queryFn as () => Promise<unknown>;
    await withPage();
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/tours?page=2&limit=20", { escalate: "none" });

    mockedApiJson.mockClear();
    const firstPage = tourCatalogOptions({ page: 0 }).queryFn as () => Promise<unknown>;
    await firstPage();
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/tours", { escalate: "none" });
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
    // escalate: none — an anonymous marketplace read must not pop the re-auth modal on a 401
    // (H2c; matches tourCatalogOptions and the other public queries).
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/tours/abc", { escalate: "none" });
    expect(result).toBe(payload);
  });

  it("queryFn encodes the id into the path", async () => {
    mockedApiJson.mockResolvedValue({} as never);

    const queryFn = tourDetailOptions("a b/c?d").queryFn as () => Promise<unknown>;
    await queryFn();

    expect(mockedApiJson).toHaveBeenCalledWith("/v1/tours/a%20b%2Fc%3Fd", { escalate: "none" });
  });
});
