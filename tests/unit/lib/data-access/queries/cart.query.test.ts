import { cartOptions } from "@/lib/data-access/queries/cart.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("cartOptions", () => {
  it("uses the cart queryKey", () => {
    expect(cartOptions().queryKey).toEqual(queryKeys.cart());
    expect(cartOptions().queryKey).toEqual(["cart"]);
  });

  it("queryFn GETs /v1/cart and returns the resolved Contract-A booking list", async () => {
    const payload = [{ id: "booking-1", tourTitle: "Campus walk" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = cartOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledWith("/v1/cart");
    expect(result).toBe(payload);
  });
});
