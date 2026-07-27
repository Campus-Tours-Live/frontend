import { type ReactElement } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ParticipantOnboardingForm } from "@/components/signup/ParticipantOnboardingForm";

// Exercise the REAL react-hook-form flow + step state; mock only the data-access
// boundary so we can drive `useMe` prefill, supply topic/university options, and
// assert the submit payload + navigation (mirrors GuideOnboardingForm.test).

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const mutateAsync = jest.fn();
let meValue: { firstName?: string; lastName?: string; roles?: string[] } | null = null;
let universityResults: Array<{ id: string; name: string; shortName?: string }> = [];
// Records the `source` the form asks the university search to use ("live" vs "catalog").
let lastUniversitySource: string | undefined;

jest.mock("@/lib/data-access", () => ({
  useMe: () => ({
    me: meValue,
    isLoading: false,
    isOnboarded: !!meValue && (meValue.roles?.length ?? 0) > 0,
    hasRole: () => false,
  }),
  useTourTopics: () => ({
    data: [
      { value: "academics", label: "Academics" },
      { value: "dorms", label: "Dorm life" },
    ],
  }),
  useUpdateParticipantProfile: () => ({ mutateAsync }),
  useUniversitySearch: (query: string, opts?: { enabled?: boolean; source?: string }) => {
    lastUniversitySource = opts?.source;
    return {
      data: opts?.enabled === false ? [] : query ? universityResults : [],
      isFetching: false,
    };
  },
}));

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue({});
  meValue = null;
  lastUniversitySource = undefined;
  // id is a College Scorecard school id (participant uses the live Scorecard directory).
  universityResults = [{ id: "166683", name: "State University", shortName: "State" }];
});

describe("ParticipantOnboardingForm (wizard)", () => {
  it("renders step 1 with name + minimal participant types", async () => {
    renderWithQuery(<ParticipantOnboardingForm />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /prospective student/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /parent or guardian/i })).toBeInTheDocument();
    // Transfer/International are no longer participant types here.
    expect(screen.queryByRole("button", { name: /transfer student/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /skip for now/i })).not.toBeInTheDocument();
    await act(async () => {});
  });

  it("blocks Continue until first and last name are filled (required)", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/please enter your first and last name/i)).toBeInTheDocument();
    expect(screen.queryByText(/universities of interest/i)).not.toBeInTheDocument();
  });

  it("strips characters that aren't allowed in a name as you type", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);
    // Digits / symbols are removed on input (sanitizeName → setValue), keeping allowed punctuation.
    await user.type(screen.getByLabelText(/first name/i), "John5");
    await user.type(screen.getByLabelText(/last name/i), "O'Br@ien");
    expect(screen.getByLabelText(/first name/i)).toHaveValue("John");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("O'Brien");
  });

  it("advances to the Universities step once names are filled", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);
    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/universities of interest/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search universities/i)).toBeInTheDocument();
  });

  it("searches universities via the live College Scorecard source (not the local catalog)", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);
    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByPlaceholderText(/search universities/i);
    // Selected school ids are Scorecard ids, which feed /v1/meta/majors and the profile payload.
    expect(lastUniversitySource).toBe("live");
  });

  it("walks all steps and submits the mapped payload, then navigates", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);
    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.click(screen.getByRole("button", { name: /parent or guardian/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Universities step — pick the single mocked option.
    await user.type(await screen.findByPlaceholderText(/search universities/i), "state");
    await user.click(await screen.findByRole("button", { name: /State University/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Topics step — pick one, then Submit.
    await user.click(await screen.findByRole("checkbox", { name: /Academics/i }));
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({
      firstName: "Jordan",
      lastName: "Lee",
      participantType: "PARENT",
      universitiesOfInterest: ["166683"],
      topicsOfInterest: ["academics"],
    });
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("toggles a topic off when its chip is clicked twice (deselect branch)", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);
    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.click(screen.getByRole("button", { name: /continue/i })); // → universities
    await user.click(await screen.findByRole("button", { name: /continue/i })); // → topics

    const academics = await screen.findByRole("checkbox", { name: /Academics/i });
    await user.click(academics); // select
    await user.click(academics); // deselect → exercises the filter branch
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ topicsOfInterest: [] }));
  });

  it("shows an error alert when the submit mutation rejects (no navigation)", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValueOnce(new Error("Something broke."));
    renderWithQuery(<ParticipantOnboardingForm />);
    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.click(screen.getByRole("button", { name: /continue/i })); // step 1 → 2
    await user.click(await screen.findByRole("button", { name: /continue/i })); // step 2 → 3 (both optional)
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(await screen.findByText(/something broke/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("prefills first/last name from useMe", async () => {
    meValue = { firstName: "Sam", lastName: "Rivera", roles: ["PARTICIPANT"] };
    renderWithQuery(<ParticipantOnboardingForm />);
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Sam");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("Rivera");
    await act(async () => {});
  });
});
