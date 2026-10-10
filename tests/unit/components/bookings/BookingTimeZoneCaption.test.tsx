/** @jest-environment-options {"customExportConditions": ["node", "node-addons"]} */
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { BookingTimeZoneCaption } from "@/components/bookings/BookingTimeZoneCaption";

describe("BookingTimeZoneCaption", () => {
  it("uses stable server markup without exposing the server timezone", () => {
    expect(renderToString(<BookingTimeZoneCaption />)).toContain(
      "Times shown in your local timezone",
    );
  });

  it("hydrates server markup and shows the viewer timezone on its own line", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<BookingTimeZoneCaption />);
    document.body.appendChild(container);
    const view = render(<BookingTimeZoneCaption />, { container, hydrate: true });
    const caption = screen.getByText(
      `Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
    );
    expect(caption.tagName).toBe("P");
    view.unmount();
    container.remove();
  });
});
