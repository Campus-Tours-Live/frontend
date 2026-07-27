import { type ReactElement } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateOfferingForm } from "@/components/offerings/CreateOfferingForm";
import { ApiError } from "@/lib/data-access";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mutateAsync = jest.fn();
const mockUseTourTopics = jest.fn(() => ({
  data: [{ value: "GENERAL_CAMPUS", label: "General campus" }],
  isLoading: false,
}));
const mockUseGuideProfile = jest.fn(() => ({
  data: { universityId: "uni-1", universityName: "State University" },
  isLoading: false,
}));
jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useCreateOffering: () => ({ mutateAsync, isPending: false }),
  useTourTopics: () => mockUseTourTopics(),
  useGuideProfile: () => mockUseGuideProfile(),
}));

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue({ id: "o1" });
  mockUseTourTopics.mockReturnValue({
    data: [{ value: "GENERAL_CAMPUS", label: "General campus" }],
    isLoading: false,
  });
  mockUseGuideProfile.mockReturnValue({
    data: { universityId: "uni-1", universityName: "State University" },
    isLoading: false,
  });
});

describe("CreateOfferingForm", () => {
  it("creates a draft and navigates back to the list", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CreateOfferingForm />);

    expect(screen.getByText("State University")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/public title/i), "Campus walk");
    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      title: "Campus walk",
      universityId: "uni-1",
      topic: "GENERAL_CAMPUS",
      durationMin: 60,
      priceCents: 4200,
      description: undefined,
      languages: ["en-US"],
    });
    expect(push).toHaveBeenCalledWith("/guide/tour-offerings");
  });

  it("rejects out-of-range prices before submitting", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CreateOfferingForm />);

    await user.type(screen.getByLabelText(/public title/i), "Campus walk");
    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    fireEvent.change(screen.getByLabelText(/price \(usd\)/i), { target: { value: "10" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save draft" }).closest("form")!);

    expect(await screen.findByText("Price must be between $20 and $200")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("shows a validation message for 422 responses", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new ApiError(422, "Unprocessable"));
    renderWithQuery(<CreateOfferingForm />);

    await user.type(screen.getByLabelText(/public title/i), "Campus walk");
    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check your inputs — title, topic, duration, and price are required.",
    );
  });

  it("falls back to an empty topic list when useTourTopics returns no data", () => {
    mockUseTourTopics.mockReturnValue({ data: undefined, isLoading: false } as never);
    renderWithQuery(<CreateOfferingForm />);

    const topicSelect = screen.getByLabelText(/^topic$/i);
    expect(within(topicSelect).getAllByRole("option")).toHaveLength(1);
    expect(within(topicSelect).getByRole("option", { name: "Select a topic" })).toBeInTheDocument();
  });

  it("shows a generic save error for other failures", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new Error("network"));
    renderWithQuery(<CreateOfferingForm />);

    await user.type(screen.getByLabelText(/public title/i), "Campus walk");
    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not save this offering. Please try again.",
    );
  });

  it("disables submit while the verified university is loading", () => {
    mockUseGuideProfile.mockReturnValue({ data: undefined, isLoading: true } as never);
    renderWithQuery(<CreateOfferingForm />);

    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(screen.queryByText("State University")).not.toBeInTheDocument();
  });

  it("disables submit and warns when the guide has no verified university", () => {
    mockUseGuideProfile.mockReturnValue({
      data: { universityId: null, universityName: null },
      isLoading: false,
    } as never);
    renderWithQuery(<CreateOfferingForm />);

    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(
      screen.getByText(/Finish guide onboarding \(verify your school email\)/i),
    ).toBeInTheDocument();
  });

  it("falls back to a default campus label when the university name is missing", () => {
    mockUseGuideProfile.mockReturnValue({
      data: { universityId: "uni-1", universityName: null },
      isLoading: false,
    } as never);
    renderWithQuery(<CreateOfferingForm />);

    expect(screen.getByText("Your campus")).toBeInTheDocument();
  });

  it("does not submit when the verified university is missing, even if the form is force-submitted", async () => {
    mockUseGuideProfile.mockReturnValue({
      data: { universityId: null, universityName: null },
      isLoading: false,
    } as never);
    const user = userEvent.setup();
    renderWithQuery(<CreateOfferingForm />);

    await user.type(screen.getByLabelText(/public title/i), "Campus walk");
    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    fireEvent.submit(screen.getByRole("button", { name: "Save draft" }).closest("form")!);

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
