import { getServerParticipantType } from "@/lib/http/serverParticipantType";
import { cookies } from "next/headers";

// next/headers is server-only; mock cookies() so we can control which session
// cookie (if any) getServerParticipantType sees. Each test sets the mock implementation.
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

const mockedCookies = cookies as jest.MockedFunction<typeof cookies>;

const SESSION_COOKIE = "ctl_sess";
const BFF_URL = "http://bff.internal:8080";

/** Build a cookies() store stub whose get() returns the given cookie value. */
function cookieStore(value: string | undefined) {
  return {
    get: jest.fn((name: string) =>
      name === SESSION_COOKIE && value !== undefined ? { name, value } : undefined,
    ),
  };
}

let fetchMock: jest.Mock;
const ORIGINAL_BFF_URL = process.env.BFF_URL;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  mockedCookies.mockReset();
  process.env.BFF_URL = BFF_URL;
});

afterAll(() => {
  if (ORIGINAL_BFF_URL === undefined) delete process.env.BFF_URL;
  else process.env.BFF_URL = ORIGINAL_BFF_URL;
});

describe("getServerParticipantType — guards before fetching", () => {
  it("returns null and never fetches when there is no session cookie", async () => {
    mockedCookies.mockResolvedValue(
      cookieStore(undefined) as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    await expect(getServerParticipantType()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null and never fetches when BFF_URL is unset", async () => {
    delete process.env.BFF_URL;
    mockedCookies.mockResolvedValue(
      cookieStore("session-token") as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    await expect(getServerParticipantType()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getServerParticipantType — with a session cookie and BFF_URL set", () => {
  beforeEach(() => {
    mockedCookies.mockResolvedValue(
      cookieStore("session-token") as unknown as Awaited<ReturnType<typeof cookies>>,
    );
  });

  it("forwards the session cookie to BFF_URL/v1/participant/profile with no-store cache", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: { type: "PARENT" } }),
    });

    await getServerParticipantType();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${BFF_URL}/v1/participant/profile`, {
      headers: {
        cookie: `${SESSION_COOKIE}=session-token`,
        accept: "application/json",
      },
      cache: "no-store",
    });
  });

  it("returns the type from the { data } envelope on a 2xx", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: { type: "PARENT" } }),
    });

    await expect(getServerParticipantType()).resolves.toBe("PARENT");
  });

  it("returns the type from the raw json when there is no data envelope", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ type: "GUARDIAN" }),
    });

    await expect(getServerParticipantType()).resolves.toBe("GUARDIAN");
  });

  it("returns null when the profile has no type", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: {} }),
    });

    await expect(getServerParticipantType()).resolves.toBeNull();
  });

  it("returns null when the BFF responds non-ok", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: jest.fn(),
    });

    await expect(getServerParticipantType()).resolves.toBeNull();
  });

  it("returns null (never throws) when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(getServerParticipantType()).resolves.toBeNull();
  });
});
