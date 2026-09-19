import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatEndTime,
  formatLongDate,
  statusBadgeClass,
} from "@/lib/format";

describe("formatDuration", () => {
  it("renders whole hours", () => {
    expect(formatDuration(1)).toBe("1 jam");
    expect(formatDuration(2)).toBe("2 jam");
  });

  it("renders fractional hours as minutes", () => {
    expect(formatDuration(0.5)).toBe("30 menit");
    expect(formatDuration(1.5)).toBe("90 menit");
  });
});

describe("formatEndTime", () => {
  it("adds duration to start time", () => {
    expect(formatEndTime("08:00", 1)).toBe("09:00");
    expect(formatEndTime("08:00", 1.5)).toBe("09:30");
  });
});

describe("formatLongDate", () => {
  it("uses day month year ordering", () => {
    expect(formatLongDate("2026-09-19")).toBe("19 September 2026");
  });
});

describe("statusBadgeClass", () => {
  it("maps every status to a distinct style", () => {
    const confirmed = statusBadgeClass("CONFIRMED");
    const cancelled = statusBadgeClass("CANCELLED");
    const pending = statusBadgeClass("PENDING");
    expect(confirmed).not.toBe(cancelled);
    expect(cancelled).not.toBe(pending);
    expect(pending).not.toBe(confirmed);
  });
});