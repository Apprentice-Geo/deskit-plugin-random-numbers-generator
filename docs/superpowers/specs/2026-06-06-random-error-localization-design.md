# Random Error Localization Design

## Goal

Separate query validation from user-facing language:

- `src/random.ts` returns structured errors containing only an error code and optional interpolation parameters.
- `src/index.ts` translates those errors according to `ctx.locale`.
- Locales beginning with `zh` use Simplified Chinese. All other locales fall back to English.

## Error Contract

`parseQuery` returns errors in this shape:

```ts
interface ErrorQuery {
  kind: "error"
  code: ErrorCode
  params?: Record<string, string | number>
}
```

The supported codes are:

- `expected_input`
- `too_many_numeric_args`
- `unsupported_option`
- `min_not_integer`
- `max_not_integer`
- `count_not_integer`
- `min_greater_than_max`
- `count_not_positive`
- `count_over_limit`
- `range_too_large`
- `unique_range_too_small`

Only errors requiring dynamic values include `params`:

- `unsupported_option`: `{ option }`
- `count_over_limit`: `{ maxCount }`
- `unique_range_too_small`: `{ count, rangeSize }`

## Translation

`src/index.ts` owns a typed `switch` over `ErrorCode`. Each branch returns the existing English message or its Chinese equivalent, interpolating values from `params` where required.

Locale normalization remains:

- `ctx.locale.toLowerCase().startsWith("zh")` -> Chinese
- every other value -> English

The result list continues to use the localized generic error title and places the translated validation message in the subtitle.

## Testing

Update parser tests to assert exact structured error results instead of inspecting English message fragments. Cover every error code and all parameterized errors.

Add plugin-level tests that execute the command with controlled contexts and verify:

- English error text for an English locale
- Chinese error text for a `zh` locale
- English fallback for a non-Chinese locale
- interpolation of dynamic error parameters

Run the full test suite, typecheck, build, and manifest validation after implementation.

## Scope

Do not change successful parsing, number generation, clipboard behavior, examples, or other UI copy. Avoid introducing a general-purpose i18n framework for this fixed two-language error set.
