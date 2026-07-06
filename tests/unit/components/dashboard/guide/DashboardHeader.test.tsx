import { render, screen } from "@testing-library/react";
import { DashboardHeader } from "@/components/dashboard/guide/DashboardHeader";

function mockHour(hour: number) {
  jest.spyOn(Date.prototype, "getHours").mockReturnValue(hour);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("DashboardHeader", () => {
  describe("time-of-day greeting", () => {
    it("says Good morning before noon", () => {
      mockHour(8);
      render(<DashboardHeader firstName="Maya" />);
      expect(screen.getByRole("heading")).toHaveTextContent("Good morning, Maya");
    });

    it("says Good afternoon from noon to 16:59", () => {
      mockHour(14);
      render(<DashboardHeader firstName="Maya" />);
      expect(screen.getByRole("heading")).toHaveTextContent("Good afternoon, Maya");
    });

    it("says Good evening from 17:00 onwards", () => {
      mockHour(20);
      render(<DashboardHeader firstName="Maya" />);
      expect(screen.getByRole("heading")).toHaveTextContent("Good evening, Maya");
    });

    it("treats midnight (hour 0) as morning", () => {
      mockHour(0);
      render(<DashboardHeader firstName="Maya" />);
      expect(screen.getByRole("heading")).toHaveTextContent("Good morning, Maya");
    });

    it("treats hour 11 as morning (boundary)", () => {
      mockHour(11);
      render(<DashboardHeader firstName="Maya" />);
      expect(screen.getByRole("heading")).toHaveTextContent("Good morning, Maya");
    });

    it("treats hour 12 as afternoon (boundary)", () => {
      mockHour(12);
      render(<DashboardHeader firstName="Maya" />);
      expect(screen.getByRole("heading")).toHaveTextContent("Good afternoon, Maya");
    });

    it("treats hour 16 as afternoon (boundary)", () => {
      mockHour(16);
      render(<DashboardHeader firstName="Maya" />);
      expect(screen.getByRole("heading")).toHaveTextContent("Good afternoon, Maya");
    });

    it("treats hour 17 as evening (boundary)", () => {
      mockHour(17);
      render(<DashboardHeader firstName="Maya" />);
      expect(screen.getByRole("heading")).toHaveTextContent("Good evening, Maya");
    });
  });

  describe("name rendering", () => {
    it("renders the provided firstName in the greeting", () => {
      mockHour(9);
      render(<DashboardHeader firstName="Jordan" />);
      expect(screen.getByRole("heading")).toHaveTextContent("Jordan");
    });

    it("falls back to 'there' when firstName is null", () => {
      mockHour(9);
      render(<DashboardHeader firstName={null} />);
      expect(screen.getByRole("heading")).toHaveTextContent("Good morning, there");
    });

    it("falls back to 'there' when firstName is undefined", () => {
      mockHour(9);
      render(<DashboardHeader firstName={undefined} />);
      expect(screen.getByRole("heading")).toHaveTextContent("Good morning, there");
    });
  });

  describe("static content", () => {
    it("shows the Guide Dashboard eyebrow label", () => {
      mockHour(9);
      render(<DashboardHeader firstName="Maya" />);
      expect(screen.getByText("Guide Dashboard")).toBeInTheDocument();
    });

    it("shows the subtitle copy", () => {
      mockHour(9);
      render(<DashboardHeader firstName="Maya" />);
      expect(
        screen.getByText(/Review booking requests.*keep your guide profile ready/i),
      ).toBeInTheDocument();
    });

    it("shows the Edit Availability button", () => {
      mockHour(9);
      render(<DashboardHeader firstName="Maya" />);
      expect(screen.getByRole("button", { name: /edit availability/i })).toBeInTheDocument();
    });
  });
});
