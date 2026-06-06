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
    const parsed = parseQuery("100 1")

    expect(parsed.kind).toBe("error")
    if (parsed.kind === "error") {
      expect(parsed.message).toContain("min")
    }
  })

  it("rejects zero count", () => {
    const parsed = parseQuery("1 100 0")

    expect(parsed.kind).toBe("error")
    if (parsed.kind === "error") {
      expect(parsed.message).toContain("greater than 0")
    }
  })

  it("rejects negative count", () => {
    const parsed = parseQuery("1 100 -1")

    expect(parsed.kind).toBe("error")
    if (parsed.kind === "error") {
      expect(parsed.message).toContain("greater than 0")
    }
  })

  it("rejects count over limit", () => {
    const parsed = parseQuery(`1 100 ${MAX_COUNT + 1}`)

    expect(parsed.kind).toBe("error")
    if (parsed.kind === "error") {
      expect(parsed.message).toContain(MAX_COUNT.toString())
    }
  })

  it("rejects decimal numbers", () => {
    expect(parseQuery("1.5 10").kind).toBe("error")
    expect(parseQuery("1 10 2.5").kind).toBe("error")
  })

  it("rejects non-numeric arguments", () => {
    expect(parseQuery("1 a 5").kind).toBe("error")
  })

  it("rejects unsupported options", () => {
    const parsed = parseQuery("1 100 5 --foo")

    expect(parsed.kind).toBe("error")
    if (parsed.kind === "error") {
      expect(parsed.message).toContain("--foo")
    }
  })

  it("rejects too many numeric arguments", () => {
    const parsed = parseQuery("1 100 5 6")

    expect(parsed.kind).toBe("error")
    if (parsed.kind === "error") {
      expect(parsed.message).toContain("Too many")
    }
  })

  it("rejects unique count greater than range size", () => {
    const parsed = parseQuery("1 3 5 --unique")

    expect(parsed.kind).toBe("error")
    if (parsed.kind === "error") {
      expect(parsed.message).toContain("--unique")
    }
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
  const parsed = parseQuery("1 100 5 --foo")

  expect(parsed.kind).toBe("error")
  if (parsed.kind === "error") {
    expect(parsed.message).toContain("--foo")
  }
})

it("rejects malformed long options", () => {
  expect(parseQuery("1 100 5 --").kind).toBe("error")
  expect(parseQuery("1 100 5 --unique=true").kind).toBe("error")
  expect(parseQuery("1 100 5 --count=5").kind).toBe("error")
})

it("rejects unsupported short options", () => {
  expect(parseQuery("1 100 5 -x").kind).toBe("error")
})