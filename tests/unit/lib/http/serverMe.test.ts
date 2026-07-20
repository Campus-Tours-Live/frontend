import { getServerMe } from "@/lib/http/serverMe";
import { cookies } from "next/headers";

// next/headers is server-only; mock cookies() so we can control which session
// cookie (if any) getServerMe sees. Each test sets the mock implementation.
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

describe("getServerMe — guards before fetching", () => {
  it("returns null and never fetches when there is no session cookie", async () => {
    mockedCookies.mockResolvedValue(
      cookieStore(undefined) as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    await expect(getServerMe()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null and never fetches when BFF_URL is unset", async () => {
    delete process.env.BFF_URL;
    mockedCookies.mockResolvedValue(
      cookieStore("session-token") as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    await expect(getServerMe()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getServerMe — with a session cookie and BFF_URL set", () => {
  beforeEach(() => {
    mockedCookies.mockResolvedValue(
      cookieStore("session-token") as unknown as Awaited<ReturnType<typeof cookies>>,
    );
  });

  it("forwards the session cookie to BFF_URL/v1/userinfo with no-store cache", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: { id: "u1" } }),
    });

    await getServerMe();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${BFF_URL}/v1/userinfo`, {
      headers: {
        cookie: `${SESSION_COOKIE}=session-token`,
        accept: "application/json",
      },
      cache: "no-store",
    });
  });

  it("unwraps the { data } envelope and returns json.data on a 2xx", async () => {
    const me = { id: "u1", roles: ["PARTICIPANT"] };
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: me }),
    });

    await expect(getServerMe()).resolves.toEqual(me);
  });

  it("returns the whole json when there is no data envelope", async () => {
    const raw = { id: "u1", roles: ["GUIDE"] };
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(raw),
    });

    await expect(getServerMe()).resolves.toEqual(raw);
  });

  it("returns null when the BFF responds non-ok", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: jest.fn(),
    });

    await expect(getServerMe()).resolves.toBeNull();
  });

  it("returns null (never throws) when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(getServerMe()).resolves.toBeNull();
  });

  it("returns null (never throws) when json parsing rejects", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
    });

    await expect(getServerMe()).resolves.toBeNull();
  });
});
