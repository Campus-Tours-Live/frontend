import { submitLogout } from "@/lib/auth/logout";

describe("submitLogout", () => {
  it("submits a POST form to /auth/logout", () => {
    // jsdom's HTMLFormElement.submit throws "Not implemented" — spy over it to observe the call.
    const submitSpy = jest
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => undefined);
    try {
      submitLogout();

      expect(submitSpy).toHaveBeenCalledTimes(1);
      const form = submitSpy.mock.instances[0] as unknown as HTMLFormElement;
      expect(form.method).toBe("post");
      expect(new URL(form.action, "http://localhost").pathname).toBe("/auth/logout");
    } finally {
      submitSpy.mockRestore();
      document.querySelectorAll("form").forEach((f) => f.remove());
    }
  });
});
