import {
  formatClipDuration,
  createClipTitle,
  formatRelativeTime,
} from "./format";

describe("formatClipDuration", () => {
  it("formats milliseconds to M:SS", () => {
    expect(formatClipDuration(0)).toBe("0:00");
    expect(formatClipDuration(3000)).toBe("0:03");
    expect(formatClipDuration(60000)).toBe("1:00");
    expect(formatClipDuration(90000)).toBe("1:30");
    expect(formatClipDuration(125000)).toBe("2:05");
  });
});

describe("createClipTitle", () => {
  it("produces expected format", () => {
    const title = createClipTitle(new Date("2026-03-11T23:35:55.595Z"));
    expect(title).toMatch(/^Clip from /);
    expect(title).toContain("Mar");
    expect(title).toContain("11");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "just now" for recent times', () => {
    const now = new Date("2026-03-11T12:00:00Z");
    jest.setSystemTime(now);

    expect(formatRelativeTime("2026-03-11T11:59:30Z")).toBe("just now");
  });

  it('returns "X min ago" for times under an hour', () => {
    const now = new Date("2026-03-11T12:00:00Z");
    jest.setSystemTime(now);

    expect(formatRelativeTime("2026-03-11T11:55:00Z")).toBe("5 min ago");
  });

  it('returns "X hours ago" for times under a day', () => {
    const now = new Date("2026-03-11T15:00:00Z");
    jest.setSystemTime(now);

    expect(formatRelativeTime("2026-03-11T12:00:00Z")).toBe("3 hours ago");
  });

  it('returns "1 hour ago" for singular', () => {
    const now = new Date("2026-03-11T13:00:00Z");
    jest.setSystemTime(now);

    expect(formatRelativeTime("2026-03-11T12:00:00Z")).toBe("1 hour ago");
  });

  it('returns "X days ago" for times under a week', () => {
    const now = new Date("2026-03-14T12:00:00Z");
    jest.setSystemTime(now);

    expect(formatRelativeTime("2026-03-11T12:00:00Z")).toBe("3 days ago");
  });

  it('returns "1 day ago" for singular', () => {
    const now = new Date("2026-03-12T12:00:00Z");
    jest.setSystemTime(now);

    expect(formatRelativeTime("2026-03-11T12:00:00Z")).toBe("1 day ago");
  });

  it("returns date fallback for times over a week", () => {
    const now = new Date("2026-03-25T12:00:00Z");
    jest.setSystemTime(now);

    const result = formatRelativeTime("2026-03-11T12:00:00Z");
    expect(result).toContain("Mar");
    expect(result).toContain("11");
  });
});
