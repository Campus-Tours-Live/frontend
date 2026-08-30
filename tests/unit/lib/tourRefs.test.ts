import { tourHref, tourIdFromRef } from "@/lib/tourRefs";

const uuid = "7b7ad66c-3a2b-4cc9-95ba-95f9148f818e";

describe("tourRefs", () => {
  it("builds detail URLs with a parseable UUID and clean slug suffix", () => {
    expect(tourHref({ id: uuid, slug: "Campus Life & Hidden Spots!", title: "" })).toBe(
      `/tours/${uuid}-campus-life-hidden-spots`,
    );
    expect(tourHref({ id: uuid, slug: "", title: "Student's Guide to North Campus" })).toBe(
      `/tours/${uuid}-students-guide-to-north-campus`,
    );
  });

  it("extracts only UUID prefixes and rejects unparseable refs", () => {
    expect(tourIdFromRef(uuid)).toBe(uuid);
    expect(tourIdFromRef(`${uuid}-campus-life`)).toBe(uuid);
    expect(tourIdFromRef("campus-life")).toBeNull();
    expect(tourIdFromRef("%E0%A4%A")).toBeNull();
    expect(tourIdFromRef(null)).toBeNull();
  });
});
