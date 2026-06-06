import type { ListItem, ListView, PluginContext, PluginModule } from "@deskit/plugin-sdk"
import { formatOutput, generateNumbers, parseQuery } from "./random"

const COMMAND_ID = "random-numbers-generator.generate"
const PREVIEW_COUNT = 16

let cached: {
  key: string
  values: number[]
  copiedText: string | null
} | null = null

const plugin: PluginModule = {
  commands: {
    [COMMAND_ID]: {
      run({ initialQuery }, ctx) {
        return makeView(initialQuery ?? "", ctx, true)
      },
      onSearchChange(text, ctx) {
        return makeView(text, ctx, false)
      },
    },
  },
}

function makeView(rawInput: string, ctx: PluginContext, forceGenerate: boolean): ListView {
  const locale = normalizeLocale(ctx.locale)
  const parsed = parseQuery(rawInput)

  return {
    type: "list",
    searchPlaceholder: t(
      locale,
      "Try: 1 100 5 --unique",
      "试试：1 100 5 --unique"
    ),
    emptyText: t(locale, "Type min max [count] [-u/--unique]", "输入 min max [count] [-u/--unique]"),
    sections: [
      {
        title: t(locale, "Result", "结果"),
        items: resultItems(parsed, ctx, locale, forceGenerate),
      },
      {
        title: t(locale, "Examples", "示例"),
        items: exampleItems(locale),
      },
    ],
  }
}

function resultItems(
  parsed: ParsedQuery,
  ctx: PluginContext,
  locale: Locale,
  forceGenerate: boolean
): ListItem[] {
  if (parsed.kind === "empty") {
    return [
      {
        id: "usage",
        title: t(locale, "Type min max [count] [-u/--unique]", "输入 min max [count] [-u/--unique]"),
        subtitle: t(
          locale,
          "Example: 1 1024 5 -u",
          "示例：1 1024 5 -u"
        ),
        icon: "lucide:dices",
        actions: [],
      },
    ]
  }

  if (parsed.kind === "error") {
    return [
      {
        id: "error",
        title: t(locale, "Invalid input", "输入无效"),
        subtitle: parsed.message,
        icon: "lucide:alert-circle",
        actions: [],
      },
    ]
  }

  const key = generationKey(parsed)

  if (forceGenerate || cached?.key !== key) {
    cached = {
      key,
      values: generateNumbers(parsed),
      copiedText: null,
    }
  }

  const values = cached.values
  const output = formatOutput(values)

  if (cached.copiedText !== output) {
    cached.copiedText = output
    void ctx.clipboard.writeText(output).catch((error) => {
      ctx.log("Failed to write random numbers to clipboard", error)
    })
  }

  const preview = values.slice(0, PREVIEW_COUNT).join(", ")
  const title =
    parsed.count === 1
      ? String(values[0])
      : t(
          locale,
          `Generated ${parsed.count} random integer${parsed.count > 1 ? "s" : ""}`,
          `已生成 ${parsed.count} 个随机整数`
        )

  const subtitleParts = [
    t(locale, `Range: ${parsed.min} to ${parsed.max}`, `范围：${parsed.min} 到 ${parsed.max}`),
    `count=${parsed.count}`,
    parsed.unique ? "--unique" : null,
    t(locale, "Copied to clipboard", "已复制到剪贴板"),
  ].filter(Boolean)

  return [
    {
      id: "result",
      title,
      subtitle:
        parsed.count === 1
          ? subtitleParts.join(" · ")
          : `${subtitleParts.join(" · ")} · ${t(locale, "Preview", "预览")}: ${preview}${
              values.length > PREVIEW_COUNT ? " ..." : ""
            }`,
      icon: parsed.unique ? "lucide:shuffle" : "lucide:dices",
      actions: [
        {
          type: "copy",
          label: t(locale, "Copy again", "再次复制"),
          value: output,
        },
      ],
    },
  ]
}

function exampleItems(locale: Locale): ListItem[] {
  const examples = ["1 5", "1 1024 10", "1 1024 10 -u", "1 1024 10 --unique", "--unique -1024 1024 10", "-u -1024 1024 10"]

  return examples.map((example) => ({
    id: `example:${example}`,
    title: example,
    subtitle: t(locale, "Copy this example", "复制这个示例"),
    icon: "lucide:copy",
    actions: [
      {
        type: "copy",
        label: t(locale, "Copy", "复制"),
        value: example,
      },
    ],
  }))
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

function generationKey(query: SuccessfulQuery): string {
  return `${query.min}:${query.max}:${query.count}:${query.unique}`
}

function normalizeLocale(locale: string): Locale {
  return locale.toLowerCase().startsWith("zh") ? "zh-CN" : "en"
}

function t(locale: Locale, en: string, zhCN: string): string {
  return locale === "zh-CN" ? zhCN : en
}

type Locale = "en" | "zh-CN"

type ParsedQuery = EmptyQuery | ErrorQuery | SuccessfulQuery

interface EmptyQuery {
  kind: "empty"
}

interface ErrorQuery {
  kind: "error"
  message: string
}

interface SuccessfulQuery {
  kind: "success"
  min: number
  max: number
  count: number
  unique: boolean
}

export = plugin