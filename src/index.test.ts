import type { ListView, PluginContext } from "@deskit/plugin-sdk"
import { describe, expect, it } from "vitest"
import plugin from "./index"

const COMMAND_ID = "random-numbers-generator.generate"

describe("localized validation errors", () => {
  it("renders errors in English", async () => {
    expect(await errorSubtitle("en", "100 1")).toBe(
      "min must be less than or equal to max"
    )
  })

  it("renders errors in Chinese for zh locales", async () => {
    expect(await errorSubtitle("zh-CN", "100 1")).toBe("min 必须小于或等于 max")
  })

  it("falls back to English for non-Chinese locales", async () => {
    expect(await errorSubtitle("fr-FR", "100 1")).toBe(
      "min must be less than or equal to max"
    )
  })

  it("interpolates error parameters in Chinese", async () => {
    expect(await errorSubtitle("zh-Hans", "1 3 5 --unique")).toBe(
      "-u/--unique 需要范围内至少有 5 个整数，但当前只有 3 个"
    )
  })

  it("interpolates unsupported options in English", async () => {
    expect(await errorSubtitle("en-US", "1 100 --foo")).toBe(
      "Unsupported option: --foo"
    )
  })
})

async function errorSubtitle(locale: string, query: string): Promise<string> {
  const handler = plugin.commands[COMMAND_ID]
  const view = await handler.run(
    {
      commandId: COMMAND_ID,
      initialQuery: query,
    },
    context(locale)
  )
  const list = view as ListView
  const subtitle = list.sections?.[0]?.items[0]?.subtitle

  if (typeof subtitle !== "string") {
    throw new Error("Expected an error subtitle")
  }

  return subtitle
}

function context(locale: string): PluginContext {
  return {
    locale,
  } as PluginContext
}
