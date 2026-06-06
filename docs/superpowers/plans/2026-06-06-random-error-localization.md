# Random Error Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make query parsing return language-neutral error codes and parameters, then translate those errors in the plugin UI from `ctx.locale`.

**Architecture:** `src/random.ts` owns validation and a discriminated error union without user-facing text. `src/index.ts` owns locale normalization and an exhaustive error formatter. Parser tests verify the data contract; plugin tests verify rendered English, Chinese, fallback, and interpolated messages.

**Tech Stack:** TypeScript, Vitest, DesKit plugin SDK ambient types

---

### Task 1: Lock Down Structured Parser Errors

**Files:**
- Modify: `src/random.test.ts`
- Modify: `src/random.ts`

- [x] **Step 1: Replace message-fragment assertions with exact structured errors**

Add assertions covering every error code:

```ts
expect(parseQuery("100 1")).toEqual({
  kind: "error",
  code: "min_greater_than_max",
})

expect(parseQuery(`1 100 ${MAX_COUNT + 1}`)).toEqual({
  kind: "error",
  code: "count_over_limit",
  params: { maxCount: MAX_COUNT },
})
```

Include exact parameter assertions for `unsupported_option` and `unique_range_too_small`.

- [x] **Step 2: Run parser tests and verify the old message contract fails**

Run: `npm test -- src/random.test.ts`

Expected: FAIL while parser errors still expose or are tested through `message`, or if optional parameters are emitted inconsistently.

- [x] **Step 3: Implement the minimal structured error contract**

Define `ErrorCode`, update `ErrorQuery`, and return errors through:

```ts
function error(code: ErrorCode, params?: ErrorQuery["params"]): ErrorQuery {
  return params === undefined
    ? { kind: "error", code }
    : { kind: "error", code, params }
}
```

Keep validation order and successful parsing behavior unchanged.

- [x] **Step 4: Run parser tests**

Run: `npm test -- src/random.test.ts`

Expected: all parser, generation, and formatting tests pass.

### Task 2: Localize Errors in the Plugin UI

**Files:**
- Create: `src/index.test.ts`
- Modify: `src/index.ts`

- [x] **Step 1: Add plugin-level localization tests**

Load the plugin and invoke the generate command with a stubbed `PluginContext`. Assert:

```ts
expect(errorSubtitle("en", "100 1")).toBe("min must be less than or equal to max")
expect(errorSubtitle("zh-CN", "100 1")).toBe("min 必须小于或等于 max")
expect(errorSubtitle("fr-FR", "100 1")).toBe("min must be less than or equal to max")
expect(errorSubtitle("zh-Hans", "1 3 5 --unique"))
  .toBe("-u/--unique 需要范围内至少有 5 个整数，但当前只有 3 个")
```

- [x] **Step 2: Run the new UI tests and verify failure**

Run: `npm test -- src/index.test.ts`

Expected: FAIL because the current `index.ts` type boundary or error formatter is incomplete.

- [x] **Step 3: Implement locale-aware error formatting**

Import `ErrorQuery` as a type, use the exported `ParsedQuery` rather than duplicate query interfaces, and add an exhaustive `formatErrorMessage` switch. Preserve `zh*` normalization and English fallback.

- [x] **Step 4: Run UI tests**

Run: `npm test -- src/index.test.ts`

Expected: all localization tests pass.

### Task 3: Verify the Complete Plugin

**Files:**
- Modify only if verification exposes an issue in files already listed above.

- [x] **Step 1: Run all tests**

Run: `npm test`

Expected: all tests pass with zero failures.

- [x] **Step 2: Run repository checks**

Run: `npm run check`

Expected: typecheck, bundle build, and manifest validation all exit successfully.

- [x] **Step 3: Review the final diff**

Run: `git diff --check` and `git diff -- src/random.ts src/random.test.ts src/index.ts src/index.test.ts`

Expected: no whitespace errors; changes remain limited to structured errors, localization, and tests.
