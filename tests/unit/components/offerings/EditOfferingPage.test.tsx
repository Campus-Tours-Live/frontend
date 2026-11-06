import { render, screen } from "@testing-library/react";
import { EditOfferingPage } from "@/components/offerings/EditOfferingPage";
import { useOfferings } from "@/lib/data-access";

jest.mock("@/components/offerings/CreateOfferingForm", () => ({
  CreateOfferingForm: ({ offering }: { offering: { title: string } }) => (
    <div>{offering.title}</div>
  ),
}));
jest.mock("@/lib/data-access", () => ({ useOfferings: jest.fn() }));

const mockUseOfferings = useOfferings as jest.Mock;
const offering = {
  id: "o1",
  title: "Campus walk",
  slug: "campus-walk",
  status: "DRAFT" as const,
  topic: "GENERAL_CAMPUS",
  universityId: "u1",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
};

beforeEach(() => {
  mockUseOfferings.mockReturnValue({ data: [offering], isLoading: false, isError: false });
});

describe("EditOfferingPage", () => {
  it("renders the selected draft in the editor", () => {
    render(<EditOfferingPage offeringId="o1" />);
    expect(screen.getByText("Campus walk")).toBeInTheDocument();
  });

  it("explains why active offerings cannot be edited", () => {
    mockUseOfferings.mockReturnValue({
      data: [{ ...offering, status: "ACTIVE" }],
      isLoading: false,
      isError: false,
    });
    render(<EditOfferingPage offeringId="o1" />);
    expect(screen.getByText(/Pause this public offering before editing/i)).toBeInTheDocument();
  });
});
