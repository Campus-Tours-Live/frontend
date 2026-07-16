import { render, screen, within } from "@testing-library/react";
import { Mail, Phone, Star } from "lucide-react";
import { MemberCard, type MemberRole } from "@/components/ui/data-display/MemberCard";

describe("MemberCard — initials derivation", () => {
  it("derives two initials from a two-word name", () => {
    render(<MemberCard name="Ada Lovelace" role="PARTICIPANT" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("derives first two letters from a single-word name (uppercased)", () => {
    render(<MemberCard name="cher" role="PARTICIPANT" />);
    expect(screen.getByText("CH")).toBeInTheDocument();
  });

  it("uses first + last initial for 3+ word names", () => {
    render(<MemberCard name="Mary Jane Watson" role="PARTICIPANT" />);
    expect(screen.getByText("MW")).toBeInTheDocument();
  });

  it("renders the fallback User icon when the name is empty/whitespace", () => {
    const { container } = render(<MemberCard name="   " role="PARTICIPANT" />);
    // No initials text node; an svg icon stands in instead.
    const avatar = container.querySelector("[aria-hidden].rounded-full");
    expect(avatar?.querySelector("svg")).toBeInTheDocument();
  });
});

describe("MemberCard — role accent + label", () => {
  it.each([
    ["PARTICIPANT", "Participant"],
    ["GUIDE", "Guide"],
    ["GUARDIAN", "Guardian"],
    ["ADMIN", "Admin"],
    ["SUPPORT", "Support"],
  ] as [MemberRole, string][])("role %s shows default label %s", (role, label) => {
    render(<MemberCard name="Test User" role={role} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("roleLabel overrides the default label", () => {
    render(<MemberCard name="Test User" role="GUIDE" roleLabel="Student Guide" />);
    expect(screen.getByText("Student Guide")).toBeInTheDocument();
    expect(screen.queryByText("Guide")).not.toBeInTheDocument();
  });

  it("renders the name as a heading", () => {
    render(<MemberCard name="Ada Lovelace" role="PARTICIPANT" />);
    expect(screen.getByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
  });
});

describe("MemberCard — verification pill", () => {
  it("renders only when verification is set", () => {
    const { rerender } = render(<MemberCard name="Ada Lovelace" role="PARTICIPANT" />);
    expect(screen.queryByText("Email verified")).not.toBeInTheDocument();

    rerender(<MemberCard name="Ada Lovelace" role="PARTICIPANT" verification="Email verified" />);
    expect(screen.getByText("Email verified")).toBeInTheDocument();
  });
});

describe("MemberCard — items rows", () => {
  it("renders each item's label and value", () => {
    render(
      <MemberCard
        name="Ada Lovelace"
        role="PARTICIPANT"
        items={[
          { icon: Mail, label: "Email", value: "ada@x.com" },
          { icon: Phone, label: "Phone", value: "555-1234" },
        ]}
      />,
    );
    const list = screen.getByRole("list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("ada@x.com")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("555-1234")).toBeInTheDocument();
  });

  it("renders no list when items is empty/omitted", () => {
    render(<MemberCard name="Ada Lovelace" role="PARTICIPANT" />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

describe("MemberCard — highlight callout", () => {
  it("renders only when highlight is set", () => {
    const { rerender } = render(<MemberCard name="Ada Lovelace" role="GUIDE" />);
    expect(screen.queryByText("Top rated")).not.toBeInTheDocument();

    rerender(
      <MemberCard
        name="Ada Lovelace"
        role="GUIDE"
        highlight={{
          icon: Star,
          title: "Top rated",
          description: "4.9 average",
        }}
      />,
    );
    expect(screen.getByText("Top rated")).toBeInTheDocument();
    expect(screen.getByText("4.9 average")).toBeInTheDocument();
  });

  it("omits the description paragraph when not provided", () => {
    render(
      <MemberCard
        name="Ada Lovelace"
        role="GUIDE"
        highlight={{ icon: Star, title: "Top rated" }}
      />,
    );
    expect(screen.getByText("Top rated")).toBeInTheDocument();
    expect(screen.queryByText("4.9 average")).not.toBeInTheDocument();
  });
});

describe("MemberCard — avatar", () => {
  it("renders an <img> when avatarUrl is provided (no initials)", () => {
    const { container } = render(
      <MemberCard name="Ada Lovelace" role="PARTICIPANT" avatarUrl="https://example.com/a.jpg" />,
    );
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://example.com/a.jpg");
    expect(screen.queryByText("AL")).not.toBeInTheDocument();
  });

  it("falls back to initials when no avatarUrl", () => {
    const { container } = render(<MemberCard name="Ada Lovelace" role="PARTICIPANT" />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });
});
