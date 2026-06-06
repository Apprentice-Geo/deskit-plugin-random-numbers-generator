export const MAX_COUNT = 1024

export type ParsedQuery = EmptyQuery | ErrorQuery | SuccessfulQuery

export interface EmptyQuery {
  kind: "empty"
}

export type ErrorCode =
  | "expected_input"
  | "too_many_numeric_args"
  | "unsupported_option"
  | "min_not_integer"
  | "max_not_integer"
  | "count_not_integer"
  | "min_greater_than_max"
  | "count_not_positive"
  | "count_over_limit"
  | "range_too_large"
  | "unique_range_too_small"

export interface ErrorQuery {
  kind: "error"
  code: ErrorCode
  params?: Record<string, string | number>
}

export interface SuccessfulQuery {
  kind: "success"
  min: number
  max: number
  count: number
  unique: boolean
}

export function parseQuery(rawInput: string): ParsedQuery {
  const input = rawInput.trim()
  if (!input) return { kind: "empty" }

  const tokens = input.split(/\s+/)
  const numberTokens: string[] = []
  let unique = false

  for (const token of tokens) {
    if (token === "--unique" || token === "-u") {
      unique = true
      continue
    }

    if (token.startsWith("-") && !/^-?\d+$/.test(token)) {
      return error("unsupported_option", { option: token })
    }

    numberTokens.push(token)
  }

  if (numberTokens.length < 2) {
    return error("expected_input")
  }

  if (numberTokens.length > 3) {
    return error("too_many_numeric_args")
  }

  const min = parseInteger(numberTokens[0])
  const max = parseInteger(numberTokens[1])
  const count = numberTokens[2] === undefined ? 1 : parseInteger(numberTokens[2])

  if (min === null) return error("min_not_integer")
  if (max === null) return error("max_not_integer")
  if (count === null) return error("count_not_integer")

  if (min > max) {
    return error("min_greater_than_max")
  }

  if (count <= 0) {
    return error("count_not_positive")
  }

  if (count > MAX_COUNT) {
    return error("count_over_limit", { maxCount: MAX_COUNT })
  }

  const rangeSize = max - min + 1

  if (!Number.isSafeInteger(rangeSize) || rangeSize <= 0) {
    return error("range_too_large")
  }

  if (unique && count > rangeSize) {
    return error("unique_range_too_small", {
      count,
      rangeSize,
    })
  }

  return { kind: "success", min, max, count, unique }
}

export function generateNumbers(query: SuccessfulQuery): number[] {
  return query.unique
    ? generateUniqueNumbers(query.min, query.max, query.count)
    : Array.from({ length: query.count }, () => randomInteger(query.min, query.max))
}

export function formatOutput(values: number[]): string {
  return values.join("\n")
}

function parseInteger(value: string): number | null {
  if (!/^[+-]?\d+$/.test(value)) return null

  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) return null

  return parsed
}

function generateUniqueNumbers(min: number, max: number, count: number): number[] {
  const rangeSize = max - min + 1

  if (rangeSize <= 50_000) {
    const pool = Array.from({ length: rangeSize }, (_, index) => min + index)

    for (let index = 0; index < count; index += 1) {
      const swapIndex = index + randomInteger(0, pool.length - index - 1)
      const temp = pool[index]
      pool[index] = pool[swapIndex]
      pool[swapIndex] = temp
    }

    return pool.slice(0, count)
  }

  const values = new Set<number>()

  while (values.size < count) {
    values.add(randomInteger(min, max))
  }

  return [...values]
}

function randomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function error(code: ErrorCode, params?: ErrorQuery["params"]): ErrorQuery {
  return params === undefined
    ? { kind: "error", code }
    : { kind: "error", code, params }
}
