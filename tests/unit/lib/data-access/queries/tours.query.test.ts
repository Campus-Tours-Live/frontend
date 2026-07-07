jest.mock("@/lib/data-access/http", () => ({
  ApiError: class ApiError extends Error {},
  apiJson: jest.fn(),
}));

import { apiJson } from "@/lib/data-access/http";
import { tourCatalogOptions, tourDetailOptions } from "@/lib/data-access/queries/tours.query";

describe("tour query contracts", () => {
  it("calls the BFF marketplace endpoint non-interactively", async () => {
    (apiJson as jest.Mock).mockResolvedValue([]);
    await tourCatalogOptions().queryFn!({} as never);
    expect(apiJson).toHaveBeenCalledWith("/v1/tours?sort=RECOMMENDED&limit=20", {
      interactive: false,
    });
  });

  it("encodes the tour id in the detail endpoint", async () => {
    (apiJson as jest.Mock).mockResolvedValue({ id: "tour/id" });
    await tourDetailOptions("tour/id").queryFn!({} as never);
    expect(apiJson).toHaveBeenCalledWith("/v1/tours/tour%2Fid", { interactive: false });
  });
});
