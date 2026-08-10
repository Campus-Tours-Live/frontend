import { tourHref, tourIdFromRef } from "@/lib/tourRefs";

const uuid = "7b7ad66c-3a2b-4cc9-95ba-95f9148f818e";

describe("tourRefs", () => {
  it("builds a frontend-only detail URL with the id first and a clean slug suffix", () => {
    expect(
      tourHref({
        id: uuid,
        slug: "Campus Life & Hidden Spots!",
        title: "Ignored when slug exists",
      }),
    ).toBe(`/tours/${uuid}-campus-life-hidden-spots`);
  });

  it("falls back to the title when the backend slug is empty", () => {
    expect(tourHref({ id: uuid, slug: "", title: "Student's Guide to North Campus" })).toBe(
      `/tours/${uuid}-students-guide-to-north-campus`,
    );
  });

  it("extracts only a UUID prefix from a direct or slugged tour ref", () => {
    expect(tourIdFromRef(uuid)).toBe(uuid);
    expect(tourIdFromRef(`${uuid}-campus-life`)).toBe(uuid);
  });

  it("returns null instead of guessing when the ref is not a UUID", () => {
    expect(tourIdFromRef("campus-life")).toBeNull();
    expect(tourIdFromRef("%E0%A4%A")).toBeNull();
    expect(tourIdFromRef(null)).toBeNull();
  });
});
