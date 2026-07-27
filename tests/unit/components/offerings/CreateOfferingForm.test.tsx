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
  data: {
    universities: [
      {
        universityId: "uni-1",
        universityName: "State University",
        verificationStatus: "VERIFIED",
      },
    ],
  },
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
    data: {
      universities: [
        {
          universityId: "uni-1",
          universityName: "State University",
          verificationStatus: "VERIFIED",
        },
      ],
    },
    isLoading: false,
  });
});

describe("CreateOfferingForm", () => {
  it("creates a draft with the auto-selected verified university and navigates back to the list", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CreateOfferingForm />);

    expect(screen.getByRole("radio", { name: "State University" })).toBeChecked();

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

  it("disables submit while the guide profile is loading", () => {
    mockUseGuideProfile.mockReturnValue({ data: undefined, isLoading: true } as never);
    renderWithQuery(<CreateOfferingForm />);

    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("disables submit and warns when the guide has no universities at all", () => {
    mockUseGuideProfile.mockReturnValue({
      data: { universities: [] },
      isLoading: false,
    } as never);
    renderWithQuery(<CreateOfferingForm />);

    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(
      screen.getByText(/Finish guide onboarding \(verify your school email\)/i),
    ).toBeInTheDocument();
  });

  it("lists every university, but only lets the VERIFIED one be selected — with a per-item reason and a group warning", async () => {
    const user = userEvent.setup();
    mockUseGuideProfile.mockReturnValue({
      data: {
        universities: [
          {
            universityId: "uni-1",
            universityName: "State University",
            verificationStatus: "VERIFIED",
          },
          {
            universityId: "uni-2",
            universityName: "Other College",
            verificationStatus: "PENDING",
          },
        ],
      },
      isLoading: false,
    } as never);
    renderWithQuery(<CreateOfferingForm />);

    const verifiedRadio = screen.getByRole("radio", { name: "State University" });
    const unverifiedRadio = screen.getByRole("radio", { name: "Other College" });
    expect(verifiedRadio).toBeChecked();
    expect(verifiedRadio).toBeEnabled();
    expect(unverifiedRadio).toBeDisabled();
    expect(
      screen.getByText("Verify your school email to create tours for this campus."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();

    // A real user can't interact with a disabled radio at all (userEvent respects `disabled`).
    await user.click(unverifiedRadio);
    expect(verifiedRadio).toBeChecked();
    expect(unverifiedRadio).not.toBeChecked();

    // Defence-in-depth: even a forced change event (bypassing the disabled-attribute guard, as
    // fireEvent does) must not move the selection onto the unverified campus.
    fireEvent.click(unverifiedRadio);
    expect(verifiedRadio).toBeChecked();
    expect(unverifiedRadio).not.toBeChecked();
  });

  it("disables submit and explains when the guide has universities but none verified", () => {
    mockUseGuideProfile.mockReturnValue({
      data: {
        universities: [
          {
            universityId: "uni-1",
            universityName: "State University",
            verificationStatus: "PENDING",
          },
        ],
      },
      isLoading: false,
    } as never);
    renderWithQuery(<CreateOfferingForm />);

    expect(screen.getByRole("radio", { name: "State University" })).toBeDisabled();
    expect(screen.getByText(/None of your universities are verified yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  });

  it("treats a VERIFIED entry without a universityId as unselectable (defensive)", () => {
    mockUseGuideProfile.mockReturnValue({
      data: {
        universities: [
          { universityId: null, universityName: null, verificationStatus: "VERIFIED" },
        ],
      },
      isLoading: false,
    } as never);
    renderWithQuery(<CreateOfferingForm />);

    const radio = screen.getByRole("radio", { name: "Your campus" });
    expect(radio).toBeDisabled();
    expect(
      screen.getByText("Verify your school email to create tours for this campus."),
    ).toBeInTheDocument();
    expect(screen.getByText(/None of your universities are verified yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  });

  it("lets the guide switch between multiple verified universities", async () => {
    const user = userEvent.setup();
    mockUseGuideProfile.mockReturnValue({
      data: {
        universities: [
          {
            universityId: "uni-1",
            universityName: "State University",
            verificationStatus: "VERIFIED",
          },
          {
            universityId: "uni-2",
            universityName: "Metro University",
            verificationStatus: "VERIFIED",
          },
        ],
      },
      isLoading: false,
    } as never);
    renderWithQuery(<CreateOfferingForm />);

    expect(screen.getByRole("radio", { name: "State University" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Metro University" })).not.toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Metro University" }));

    expect(screen.getByRole("radio", { name: "Metro University" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "State University" })).not.toBeChecked();

    await user.type(screen.getByLabelText(/public title/i), "Campus walk");
    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ universityId: "uni-2" }));
  });

  it("falls back to a default campus label when the university name is missing", () => {
    mockUseGuideProfile.mockReturnValue({
      data: {
        universities: [
          { universityId: "uni-1", universityName: null, verificationStatus: "VERIFIED" },
        ],
      },
      isLoading: false,
    } as never);
    renderWithQuery(<CreateOfferingForm />);

    expect(screen.getByRole("radio", { name: "Your campus" })).toBeChecked();
  });

  it("does not submit when no verified university is selected, even if the form is force-submitted", async () => {
    mockUseGuideProfile.mockReturnValue({
      data: {
        universities: [
          {
            universityId: "uni-1",
            universityName: "State University",
            verificationStatus: "PENDING",
          },
        ],
      },
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
