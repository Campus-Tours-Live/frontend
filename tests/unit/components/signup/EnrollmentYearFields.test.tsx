import { type ReactElement } from "react";
import { render } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { EnrollmentYearFields } from "@/components/signup/EnrollmentYearFields";
import type { EnrollmentYearFormFields } from "@/components/signup/useEnrollmentYearFields";

// The component's only data-access dependency is the year-rules query (reached through
// useEnrollmentYearFields); everything else under test here is markup + react-hook-form wiring, so
// that query is the only thing this file stubs.
jest.mock("@/lib/data-access", () => ({
  useEnrollmentYears: () => ({
    data: {
      entryYear: { min: 2016, max: 2027 },
      maxYearsToGraduate: [],
      defaultMaxYearsToGraduate: 8,
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

/** A minimal real react-hook-form host — `EnrollmentYearFields` needs live `control`/`getValues`/
 * `trigger`/`clearErrors`, not stand-ins, since `useEnrollmentYearFields` subscribes to the form via
 * `useWatch`. */
function Host(): ReactElement {
  const { control, getValues, trigger, clearErrors } = useForm<EnrollmentYearFormFields>({
    defaultValues: { entryYear: "", classYear: "", degree: "" },
  });
  return (
    <EnrollmentYearFields
      control={control}
      getValues={getValues}
      trigger={trigger}
      clearErrors={clearErrors}
    />
  );
}

describe("EnrollmentYearFields", () => {
  // CTL-97: the entry-year/class-year grid is the ONE place both GuideOnboardingForm and
  // GuideProfileForm get their side-by-side layout from, so asserting the class here covers both
  // callers without duplicating the assertion per form.
  //
  // This proves the wrapper carries the class that `globals.css` scopes its `min-height` rule to
  // (`.paired-fields .field-description`) — a structural check, not a rendered-style one. jsdom in
  // this repo does not compile Tailwind's `@apply`/globals.css, so `getComputedStyle` on the
  // description here would read an empty stylesheet, not the real rule; it does NOT prove the
  // descriptions actually end up the same height in a browser.
  it("marks its grid wrapper paired-fields so entry/class year descriptions reserve equal height", () => {
    const { container } = render(<Host />);
    const wrapper = container.querySelector(".grid");
    expect(wrapper).toHaveClass("paired-fields");
  });
});
