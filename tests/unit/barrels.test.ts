/**
 * Barrel exports. Re-exports compile to lazy getters, so a name only counts as
 * "covered" when it's accessed *through the barrel*. The submodule tests import
 * directly (e.g. "@/components/ui/Button"), so these assertions exercise the
 * public barrel surface itself.
 */
import * as ui from "@/components/ui";
import * as hooks from "@/hooks";
import * as auth from "@/lib/auth";
import * as dataAccess from "@/lib/data-access";

function expectAllDefined(mod: Record<string, unknown>, names: string[]): void {
  for (const name of names) {
    expect(mod[name]).toBeDefined();
  }
}

describe("public barrels", () => {
  it("@/components/ui exposes every primitive", () => {
    expectAllDefined(ui as unknown as Record<string, unknown>, [
      "Slot",
      "Button",
      "buttonClasses",
      "Link",
      "Badge",
      "StatusBadge",
      "Alert",
      "Banner",
      "Card",
      "MemberCard",
      "SectionHeading",
      "Heading",
      "Display",
      "Body",
      "Caption",
      "Chip",
      "Switch",
      "Checkbox",
      "Radio",
      "Breadcrumb",
      "BreadcrumbItem",
      "Tag",
      "Field",
      "TextField",
      "Textarea",
      "FormLabel",
      "FormHelperText",
      "FormGroup",
      "FocusTrap",
      "FocusGuard",
      "GoogleMark",
      "Icon",
      "Spinner",
      "Skeleton",
      "SkeletonText",
      "VisuallyHidden",
      "MenuItem",
      "MenuSection",
      "Modal",
      "Drawer",
      "VisuallyHidden",
      "Collapse",
      "WizardFooter",
      "LineClamp",
    ]);
  });

  it("@/hooks exposes every hook", () => {
    expectAllDefined(hooks as unknown as Record<string, unknown>, [
      "useDisclosure",
      "useHoverIntent",
      "useDismiss",
      "useScrollLock",
      "useDropdown",
      "useDebounced",
    ]);
  });

  it("@/lib/auth exposes the auth gate surface", () => {
    expectAllDefined(auth as unknown as Record<string, unknown>, [
      "subscribeAuthGate",
      "requireAuth",
      "completeAuth",
      "cancelAuth",
      "resetAuthGate",
      "AuthCancelledError",
    ]);
  });

  it("@/lib/data-access exposes every public hook", () => {
    expectAllDefined(dataAccess as unknown as Record<string, unknown>, [
      "useMe",
      "useParticipantProfile",
      "useGuideProfile",
      "useTourCatalog",
      "useTourDetail",
      "useTourTopics",
      "useUniversitySearch",
      "useUpdateParticipantProfile",
      "useUpdateGuideProfile",
      "useSetActiveRole",
      "useDashboard",
      "useOnboarding",
      "useOfferings",
      "useCreateOffering",
      "useActivateOffering",
    ]);
  });
});
