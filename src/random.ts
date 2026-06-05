export const MAX_COUNT = 1024

export type ParsedQuery = EmptyQuery | ErrorQuery | SuccessfulQuery

export interface EmptyQuery {
  kind: "empty"
}

export interface ErrorQuery {
  kind: "error"
  message: string
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

    if (token.startsWith("--")) {
      return { kind: "error", message: `Unsupported option: ${token}` }
    }

    numberTokens.push(token)
  }

  if (numberTokens.length < 2) {
    return { kind: "error", message: "Expected input: min max [count] [--unique]" }
  }

  if (numberTokens.length > 3) {
    return { kind: "error", message: "Too many numeric arguments. Expected: min max [count]" }
  }

  const min = parseInteger(numberTokens[0])
  const max = parseInteger(numberTokens[1])
  const count = numberTokens[2] === undefined ? 1 : parseInteger(numberTokens[2])

  if (min === null) return { kind: "error", message: "min must be an integer" }
  if (max === null) return { kind: "error", message: "max must be an integer" }
  if (count === null) return { kind: "error", message: "count must be an integer" }

  if (min > max) {
    return { kind: "error", message: "min must be less than or equal to max" }
  }

  if (count <= 0) {
    return { kind: "error", message: "count must be greater than 0" }
  }

  if (count > MAX_COUNT) {
    return { kind: "error", message: `count must be less than or equal to ${MAX_COUNT}` }
  }

  const rangeSize = max - min + 1

  if (!Number.isSafeInteger(rangeSize) || rangeSize <= 0) {
    return { kind: "error", message: "range is too large" }
  }

  if (unique && count > rangeSize) {
    return {
      kind: "error",
      message: `--unique requires at least ${count} integers in range, but only ${rangeSize} available`,
    }
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