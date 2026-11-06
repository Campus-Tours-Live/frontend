import { type ReactElement } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
const mockUseTourTopics = jest.fn();
const mockUseLanguages = jest.fn();
const mockUseTourFeatures = jest.fn();
const mockUseGuideProfile = jest.fn();

const FEATURES = {
  GENERAL_CAMPUS: [
    { value: "Q_AND_A", label: "Q&A" },
    { value: "HIDDEN_SPOTS", label: "Hidden spots" },
    { value: "PHOTOS_OK", label: "Photos allowed" },
    { value: "SMALL_GROUP", label: "Small group" },
  ],
  DORM_HOUSING: [
    { value: "DORM_INTERIOR", label: "Dorm interior" },
    { value: "Q_AND_A", label: "Q&A" },
  ],
};

const VERIFIED_UNIVERSITY = {
  universityId: "uni-1",
  universityName: "State University",
  verificationStatus: "VERIFIED",
};

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useCreateOffering: () => ({ mutateAsync, isPending: false }),
  useTourTopics: () => mockUseTourTopics(),
  useLanguages: () => mockUseLanguages(),
  useTourFeatures: () => mockUseTourFeatures(),
  useGuideProfile: () => mockUseGuideProfile(),
}));

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/public title/i), "Campus walk");
  await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
}

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue({ id: "o1" });
  mockUseTourTopics.mockReturnValue({
    data: [
      { value: "GENERAL_CAMPUS", label: "General campus" },
      { value: "DORM_HOUSING", label: "Dorm & housing" },
    ],
    isLoading: false,
  });
  mockUseLanguages.mockReturnValue({
    data: [
      { value: "en-US", label: "English" },
      { value: "es", label: "Spanish" },
    ],
    isLoading: false,
  });
  mockUseTourFeatures.mockReturnValue({
    byTopic: FEATURES,
    labelByCode: {},
    isLoading: false,
    isError: false,
  });
  mockUseGuideProfile.mockReturnValue({
    data: { universities: [VERIFIED_UNIVERSITY] },
    isLoading: false,
  });
});

describe("CreateOfferingForm", () => {
  it("creates a draft using the verified university, selected language, and features", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CreateOfferingForm />);

    expect(screen.getByRole("radio", { name: "State University" })).toBeChecked();
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Q&A" }));
    await user.click(screen.getByRole("button", { name: "Spanish" }));
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      title: "Campus walk",
      universityId: "uni-1",
      topic: "GENERAL_CAMPUS",
      durationMin: 60,
      priceCents: 4200,
      description: undefined,
      languages: ["en-US", "es"],
      features: ["Q_AND_A"],
    });
    expect(push).toHaveBeenCalledWith("/guide/tour-offerings");
  });

  it("allows switching between verified universities", async () => {
    const user = userEvent.setup();
    mockUseGuideProfile.mockReturnValue({
      data: {
        universities: [
          VERIFIED_UNIVERSITY,
          {
            universityId: "uni-2",
            universityName: "Metro University",
            verificationStatus: "VERIFIED",
          },
        ],
      },
      isLoading: false,
    });
    renderWithQuery(<CreateOfferingForm />);

    await user.click(screen.getByRole("radio", { name: "Metro University" }));
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ universityId: "uni-2" }));
  });

  it("disables unverified universities and explains why", () => {
    mockUseGuideProfile.mockReturnValue({
      data: {
        universities: [
          VERIFIED_UNIVERSITY,
          { universityId: "uni-2", universityName: "Other College", verificationStatus: "PENDING" },
        ],
      },
      isLoading: false,
    });
    renderWithQuery(<CreateOfferingForm />);

    expect(screen.getByRole("radio", { name: "State University" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Other College" })).toBeDisabled();
    expect(
      screen.getByText("Verify your school email to create tours for this campus."),
    ).toBeInTheDocument();
  });

  it("disables submit while the profile is loading or has no verified universities", () => {
    mockUseGuideProfile.mockReturnValue({ data: undefined, isLoading: true } as never);
    const loadingView = renderWithQuery(<CreateOfferingForm />);
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
    loadingView.unmount();

    mockUseGuideProfile.mockReturnValue({
      data: { universities: [{ ...VERIFIED_UNIVERSITY, verificationStatus: "PENDING" }] },
      isLoading: false,
    });
    renderWithQuery(<CreateOfferingForm />);
    expect(screen.getByText(/None of your universities are verified yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  });

  it("rejects out-of-range prices before submitting", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CreateOfferingForm />);

    await fillRequiredFields(user);
    fireEvent.change(screen.getByLabelText(/price \(usd\)/i), { target: { value: "10" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save draft" }).closest("form")!);

    expect(await screen.findByText("Price must be between $20 and $200")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("shows validation and generic errors returned by the API", async () => {
    const user = userEvent.setup();
    mutateAsync
      .mockRejectedValueOnce(new ApiError(422, "Unprocessable"))
      .mockRejectedValueOnce(new Error("network"));
    renderWithQuery(<CreateOfferingForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check your inputs — title, topic, duration, and price are required.",
    );

    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not save this offering. Please try again.",
    );
  });

  it("falls back to an empty topic list", () => {
    mockUseTourTopics.mockReturnValue({ data: undefined, isLoading: false } as never);
    renderWithQuery(<CreateOfferingForm />);

    const topicSelect = screen.getByLabelText(/^topic$/i);
    expect(within(topicSelect).getAllByRole("option")).toHaveLength(1);
  });

  it("caps feature selection at three", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CreateOfferingForm />);

    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    await user.click(screen.getByRole("button", { name: "Q&A" }));
    await user.click(screen.getByRole("button", { name: "Hidden spots" }));
    await user.click(screen.getByRole("button", { name: "Photos allowed" }));
    expect(screen.getByRole("button", { name: "Small group" })).toBeDisabled();
  });

  it("clears features invalidated by a topic change", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CreateOfferingForm />);

    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    await user.click(screen.getByRole("button", { name: "Hidden spots" }));
    await user.selectOptions(screen.getByLabelText(/^topic$/i), "DORM_HOUSING");
    await user.type(screen.getByLabelText(/public title/i), "Campus walk");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ features: undefined }));
  });

  it("shows feature and language loading/empty states", async () => {
    const user = userEvent.setup();
    mockUseTourFeatures.mockReturnValue({
      byTopic: {},
      labelByCode: {},
      isLoading: true,
      isError: false,
    } as never);
    mockUseLanguages.mockReturnValue({ data: undefined, isLoading: true } as never);
    const loadingView = renderWithQuery(<CreateOfferingForm />);

    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    expect(screen.getByText("Loading features…")).toBeInTheDocument();
    expect(screen.getByText("Loading languages…")).toBeInTheDocument();
    loadingView.unmount();

    mockUseTourFeatures.mockReturnValue({
      byTopic: { GENERAL_CAMPUS: [] },
      labelByCode: {},
      isLoading: false,
      isError: false,
    } as never);
    renderWithQuery(<CreateOfferingForm />);
    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    expect(screen.getByText("No features for this topic.")).toBeInTheDocument();
  });

  it("requires at least one language", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CreateOfferingForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "English" }));
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByText("Select at least one language")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
