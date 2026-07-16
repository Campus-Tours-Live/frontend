import { render, screen } from "@testing-library/react";
import { UniversityField } from "@/components/signup/UniversityField";
import type { UniversityOption } from "@/components/signup/UniversityMultiSelect";

// Mock the search hook (network boundary); this test is about labelling, not searching.
jest.mock("@/lib/data-access", () => ({
  useUniversitySearch: () => ({ data: [], isFetching: false }),
}));

const PICK: UniversityOption = { id: "u-1", name: "State University", shortName: "State" };

describe("UniversityField", () => {
  it("keeps an accessible group name at max, when the search input has unmounted", () => {
    render(<UniversityField label="Your university" value={[PICK]} onChange={() => {}} max={1} />);
    // max=1 with one picked → the search input is gone (steady state)…
    expect(screen.queryByPlaceholderText(/search universities/i)).not.toBeInTheDocument();
    // …but the field still has an accessible name, on the always-present group container.
    expect(screen.getByRole("group", { name: "Your university" })).toBeInTheDocument();
  });

  it("renders the search input (labelled) while below max", () => {
    render(<UniversityField label="Your university" value={[]} onChange={() => {}} max={1} />);
    expect(screen.getByPlaceholderText(/search universities/i)).toHaveAttribute("id");
    expect(screen.getByRole("group", { name: "Your university" })).toBeInTheDocument();
  });
});
