import { getTourById, TOURS } from "@/lib/tours/mockTours";

describe("mock tours", () => {
  it("finds a tour by its stable route id", () => {
    expect(getTourById("north-coast-campus-life")).toEqual(TOURS[0]);
  });

  it("returns undefined for an unknown tour", () => {
    expect(getTourById("not-a-tour")).toBeUndefined();
  });
});
