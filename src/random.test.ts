import { describe, expect, it } from "vitest"
import { formatOutput, generateNumbers, parseQuery, MAX_COUNT } from "./random"

describe("parseQuery", () => {
  it("returns empty state for empty input", () => {
    expect(parseQuery("")).toEqual({ kind: "empty" })
    expect(parseQuery("   ")).toEqual({ kind: "empty" })
  })

  it("parses min and max with default count", () => {
    expect(parseQuery("1 100")).toEqual({
      kind: "success",
      min: 1,
      max: 100,
      count: 1,
      unique: false,
    })
  })

  it("parses min, max, count", () => {
    expect(parseQuery("1 100 5")).toEqual({
      kind: "success",
      min: 1,
      max: 100,
      count: 5,
      unique: false,
    })
  })

  it("parses --unique", () => {
    expect(parseQuery("1 100 5 --unique")).toEqual({
      kind: "success",
      min: 1,
      max: 100,
      count: 5,
      unique: true,
    })
  })

  it("parses --unique before numeric args", () => {
    expect(parseQuery("--unique -10 10 8")).toEqual({
      kind: "success",
      min: -10,
      max: 10,
      count: 8,
      unique: true,
    })
  })

  it("parses -u alias", () => {
    expect(parseQuery("1 10 3 -u")).toEqual({
      kind: "success",
      min: 1,
      max: 10,
      count: 3,
      unique: true,
    })
  })

  it("rejects min greater than max", () => {
    expect(parseQuery("100 1")).toStrictEqual({
      kind: "error",
      code: "min_greater_than_max",
    })
  })

  it("rejects zero count", () => {
    expect(parseQuery("1 100 0")).toStrictEqual({
      kind: "error",
      code: "count_not_positive",
    })
  })

  it("rejects negative count", () => {
    expect(parseQuery("1 100 -1")).toStrictEqual({
      kind: "error",
      code: "count_not_positive",
    })
  })

  it("rejects count over limit", () => {
    expect(parseQuery(`1 100 ${MAX_COUNT + 1}`)).toStrictEqual({
      kind: "error",
      code: "count_over_limit",
      params: { maxCount: MAX_COUNT },
    })
  })

  it("identifies each non-integer argument", () => {
    expect(parseQuery("1.5 10")).toStrictEqual({
      kind: "error",
      code: "min_not_integer",
    })
    expect(parseQuery("1 10.5")).toStrictEqual({
      kind: "error",
      code: "max_not_integer",
    })
    expect(parseQuery("1 10 2.5")).toStrictEqual({
      kind: "error",
      code: "count_not_integer",
    })
  })

  it("rejects non-numeric arguments", () => {
    expect(parseQuery("1 a 5")).toStrictEqual({
      kind: "error",
      code: "max_not_integer",
    })
  })

  it("rejects unsupported options", () => {
    expect(parseQuery("1 100 5 --foo")).toStrictEqual({
      kind: "error",
      code: "unsupported_option",
      params: { option: "--foo" },
    })
  })

  it("rejects too many numeric arguments", () => {
    expect(parseQuery("1 100 5 6")).toStrictEqual({
      kind: "error",
      code: "too_many_numeric_args",
    })
  })

  it("rejects unique count greater than range size", () => {
    expect(parseQuery("1 3 5 --unique")).toStrictEqual({
      kind: "error",
      code: "unique_range_too_small",
      params: {
        count: 5,
        rangeSize: 3,
      },
    })
  })

  it("rejects missing numeric arguments", () => {
    expect(parseQuery("1")).toStrictEqual({
      kind: "error",
      code: "expected_input",
    })
  })

  it("rejects ranges larger than safe integer arithmetic", () => {
    expect(
      parseQuery(`${Number.MIN_SAFE_INTEGER} ${Number.MAX_SAFE_INTEGER}`)
    ).toStrictEqual({
      kind: "error",
      code: "range_too_large",
    })
  })

  it("accepts same min and max when count is 1", () => {
    expect(parseQuery("5 5 1 --unique")).toEqual({
      kind: "success",
      min: 5,
      max: 5,
      count: 1,
      unique: true,
    })
  })
})

describe("generateNumbers", () => {
  it("generates numbers inside range", () => {
    const parsed = parseQuery("1 3 100")

    expect(parsed.kind).toBe("success")
    if (parsed.kind !== "success") return

    const values = generateNumbers(parsed)

    expect(values).toHaveLength(100)
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(3)
    }
  })

  it("generates unique numbers when --unique is used", () => {
    const parsed = parseQuery("1 10 10 --unique")

    expect(parsed.kind).toBe("success")
    if (parsed.kind !== "success") return

    const values = generateNumbers(parsed)
    const uniqueValues = new Set(values)

    expect(values).toHaveLength(10)
    expect(uniqueValues.size).toBe(10)

    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(10)
    }
  })

  it("generates the only available value for a single-value range", () => {
    const parsed = parseQuery("5 5 1 --unique")

    expect(parsed.kind).toBe("success")
    if (parsed.kind !== "success") return

    expect(generateNumbers(parsed)).toEqual([5])
  })
})

describe("formatOutput", () => {
  it("formats one number", () => {
    expect(formatOutput([42])).toBe("42")
  })

  it("formats multiple numbers with newline separator", () => {
    expect(formatOutput([1, 2, 3])).toBe("1\n2\n3")
  })
})

it("rejects Chinese characters", () => {
  expect(parseQuery("一 100").kind).toBe("error")
  expect(parseQuery("1 一百 5").kind).toBe("error")
  expect(parseQuery("1 100 五").kind).toBe("error")
})

it("rejects alphabetic characters", () => {
  expect(parseQuery("a 100").kind).toBe("error")
  expect(parseQuery("1 b 5").kind).toBe("error")
  expect(parseQuery("1 100 c").kind).toBe("error")
})

it("rejects mixed numeric and alphabetic tokens", () => {
  expect(parseQuery("1a 100").kind).toBe("error")
  expect(parseQuery("1 100 5x").kind).toBe("error")
  expect(parseQuery("min 100 5").kind).toBe("error")
})

it("rejects symbol tokens", () => {
  expect(parseQuery("@ 100").kind).toBe("error")
  expect(parseQuery("1 # 5").kind).toBe("error")
  expect(parseQuery("1 100 !").kind).toBe("error")
})

it("rejects malformed signed integers", () => {
  expect(parseQuery("+ 100").kind).toBe("error")
  expect(parseQuery("- 100").kind).toBe("error")
  expect(parseQuery("+-1 100").kind).toBe("error")
  expect(parseQuery("--1 100").kind).toBe("error")
})

it("rejects unsupported long options", () => {
  expect(parseQuery("1 100 5 --foo")).toStrictEqual({
    kind: "error",
    code: "unsupported_option",
    params: { option: "--foo" },
  })
})

it("rejects malformed long options", () => {
  expect(parseQuery("1 100 5 --").kind).toBe("error")
  expect(parseQuery("1 100 5 --unique=true").kind).toBe("error")
  expect(parseQuery("1 100 5 --count=5").kind).toBe("error")
})

it("rejects unsupported short options", () => {
  expect(parseQuery("1 100 5 -x").kind).toBe("error")
})
