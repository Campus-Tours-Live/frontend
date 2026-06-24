import { type ReactElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useCreateOffering: () => ({ mutateAsync, isPending: false }),
  useTourTopics: () => ({
    data: [{ value: "GENERAL_CAMPUS", label: "General campus" }],
    isLoading: false,
  }),
}));

jest.mock("@/components/signup/UniversityMultiSelect", () => ({
  UniversityMultiSelect: ({
    value,
    onChange,
  }: {
    value: Array<{ id: string; name: string }>;
    onChange: (next: Array<{ id: string; name: string }>) => void;
  }) => (
    <button type="button" onClick={() => onChange([{ id: "uni-1", name: "State University" }])}>
      {value.length ? value[0]!.name : "Pick university"}
    </button>
  ),
}));

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue({ id: "o1" });
});

describe("CreateOfferingForm", () => {
  it("creates a draft and navigates back to the list", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CreateOfferingForm />);

    await user.type(screen.getByLabelText(/public title/i), "Campus walk");
    await user.click(screen.getByRole("button", { name: "Pick university" }));
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
    await user.click(screen.getByRole("button", { name: "Pick university" }));
    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    fireEvent.change(screen.getByLabelText(/price \(usd\)/i), { target: { value: "10" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save draft" }).closest("form")!);

    expect(await screen.findByText("Price must be between $20 and $200")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("does not submit when university is missing", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CreateOfferingForm />);

    await user.type(screen.getByLabelText(/public title/i), "Campus walk");
    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    fireEvent.submit(screen.getByRole("button", { name: "Save draft" }).closest("form")!);

    expect(await screen.findByText("University is required")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("shows a validation message for 422 responses", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new ApiError(422, "Unprocessable"));
    renderWithQuery(<CreateOfferingForm />);

    await user.type(screen.getByLabelText(/public title/i), "Campus walk");
    await user.click(screen.getByRole("button", { name: "Pick university" }));
    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check your inputs — title, university, topic, duration, and price are required.",
    );
  });

  it("shows a generic save error for other failures", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new Error("network"));
    renderWithQuery(<CreateOfferingForm />);

    await user.type(screen.getByLabelText(/public title/i), "Campus walk");
    await user.click(screen.getByRole("button", { name: "Pick university" }));
    await user.selectOptions(screen.getByLabelText(/^topic$/i), "GENERAL_CAMPUS");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not save this offering. Please try again.",
    );
  });
});
