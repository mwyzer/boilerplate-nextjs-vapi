import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  MAX_DURATION_HOURS,
  MIN_DURATION_HOURS,
  SLOT_GRANULARITY_MINUTES,
  ValidationError,
  parseBookingInput,
  parseDateInput,
  parseDurationInput,
  parseTimeInput,
  formatEndTime,
  formatLongDate,
  formatTime,
  schemaToStartEnd,
} from "@/lib/booking";

describe("parseDateInput", () => {
  it("accepts valid YYYY-MM-DD", () => {
    expect(parseDateInput("2026-10-01")).toBe("2026-10-01");
  });

  it("rejects wrong formats", () => {
    expect(() => parseDateInput("2026/10/01")).toThrowError(ValidationError);
    expect(() => parseDateInput("01-10-2026")).toThrowError(ValidationError);
    expect(() => parseDateInput("2026-13-01")).toThrowError(ValidationError);
    expect(() => parseDateInput(42)).toThrowError(ValidationError);
  });

  it("rejects impossible calendar dates", () => {
    expect(() => parseDateInput("2026-02-30")).toThrowError(ValidationError);
    expect(() => parseDateInput("2026-00-10")).toThrowError(ValidationError);
  });

  it("uses INVALID_DATE code", () => {
    try {
      parseDateInput("bad");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).code).toBe("INVALID_DATE");
    }
  });
});

describe("parseTimeInput", () => {
  it("accepts valid HH:mm", () => {
    expect(parseTimeInput("09:00")).toBe("09:00");
    expect(parseTimeInput("23:59")).toBe("23:59");
  });

  it("rejects invalid times", () => {
    expect(() => parseTimeInput("9:00")).toThrowError(ValidationError);
    expect(() => parseTimeInput("24:00")).toThrowError(ValidationError);
    expect(() => parseTimeInput("10:60")).toThrowError(ValidationError);
    expect(() => parseTimeInput("10am")).toThrowError(ValidationError);
  });
});

describe("parseDurationInput", () => {
  it("accepts values within bounds and granularity", () => {
    expect(parseDurationInput(0.5)).toBe(0.5);
    expect(parseDurationInput(1)).toBe(1);
    expect(parseDurationInput(8)).toBe(8);
    expect(parseDurationInput("1.5")).toBe(1.5);
  });

  it("rejects below minimum", () => {
    expect(() => parseDurationInput(0.25)).toThrowError(ValidationError);
    expect(() => parseDurationInput(0)).toThrowError(ValidationError);
  });

  it("rejects above maximum", () => {
    expect(() => parseDurationInput(9)).toThrowError(ValidationError);
  });

  it("rejects non-granular durations", () => {
    expect(() => parseDurationInput(1.25)).toThrowError(ValidationError);
  });

  it("rejects non-numeric values", () => {
    expect(() => parseDurationInput("abc")).toThrowError(ValidationError);
    expect(() => parseDurationInput(undefined)).toThrowError(ValidationError);
  });
});

describe("parseBookingInput", () => {
  it("parses a valid payload", () => {
    expect(
      parseBookingInput({
        name: "  Muhammad  ",
        date: "2026-10-01",
        startTime: "10:00",
        duration: 2,
      }),
    ).toEqual({
      name: "Muhammad",
      date: "2026-10-01",
      startTime: "10:00",
      duration: 2,
      resourceId: undefined,
    });
  });

  it("parses optional resourceId", () => {
    const input = parseBookingInput({
      name: "A",
      date: "2026-10-01",
      startTime: "10:00",
      duration: 2,
      resourceId: 3,
    });
    expect(input.resourceId).toBe(3);
  });

  it("rejects missing name", () => {
    expect(() =>
      parseBookingInput({ date: "2026-10-01", startTime: "10:00", duration: 2 }),
    ).toThrowError(/Nama wajib diisi/);
  });

  it("rejects non-object payload", () => {
    expect(() => parseBookingInput(null)).toThrowError(ValidationError);
    expect(() => parseBookingInput("x")).toThrowError(ValidationError);
  });
});

describe("schemaToStartEnd", () => {
  it("computes start/end and duration minutes", () => {
    const { start, end, durationMinutes } = schemaToStartEnd({
      date: "2026-10-01",
      startTime: "10:00",
      duration: 1.5,
    });
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(9);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(10);
    expect(durationMinutes).toBe(90);
    expect(end.getTime() - start.getTime()).toBe(90 * 60_000);
  });
});

describe("time formatting", () => {
  it("formats time", () => {
    expect(formatTime(new Date(2026, 0, 1, 9, 5))).toBe("09:05");
  });

  it("formats end time across limits", () => {
    expect(formatEndTime("10:00", 2)).toBe("12:00");
    expect(formatEndTime("23:00", 2)).toBe("01:00");
    expect(formatEndTime("09:00", 0.5)).toBe("09:30");
  });

  it("formats long date", () => {
    expect(formatLongDate("2026-10-01")).toBe("1 October 2026");
  });
});

describe("constants guardrails", () => {
  it("keeps slot granularity consistent with duration bounds", () => {
    const minutes = SLOT_GRANULARITY_MINUTES;
    expect((MIN_DURATION_HOURS * 60) % minutes).toBe(0);
    expect((MAX_DURATION_HOURS * 60) % minutes).toBe(0);
  });
});