# DesKit Random Numbers Generator

A random integer generator plugin for [DesKit](https://github.com/WiIIiamWei/DesKit).

This plugin is based on [deskit-plugin-template](https://github.com/WiIIiamWei/deskit-plugin-template).

## Features

* Generate random integers from a specified range.
* Support custom generation count.
* Support unique random numbers with `--unique`.
* Automatically copy generated results to clipboard.
* Display generated results in DesKit ListView.
* Show error messages for invalid input.

## Plugin Information

* Plugin ID: `com.deskit.random-numbers-generator`
* Command ID: `random-numbers-generator.generate`
* Required permission: `clipboard:write`

## Usage

Open the plugin command in DesKit and input:

```text
min max [count] [--unique]
```

Examples:

```text
1 100
1 100 5
1 100 5 --unique
--unique -10 10 8
```

### Input Rules

* `min` and `max` must be integers.
* `min <= max`.
* `count` is optional.
* If `count` is omitted, it defaults to `1`.
* `count > 0`.
* `count <= 1000`.
* When `--unique` is used, the range must contain enough integers.

For example:

```text
1 3 5 --unique
```

This is invalid because the range `[1, 3]` only contains 3 integers, but 5 unique numbers are requested.

## Output Format

Generated numbers are copied to clipboard automatically.

When generating multiple numbers, the clipboard output uses newline separation:

```text
12
87
31
5
44
```

## Development

Install dependencies:

```bash
npm install
```

Run type check:

```bash
npm run typecheck
```

Run tests:

```bash
npm run test
```

Build plugin:

```bash
npm run build
```

Validate manifest:

```bash
npm run validate
```

Run full check:

```bash
npm run check
```

Pack `.deskit` file:

```bash
npm run pack
```

## Project Structure

```text
src/
  index.ts        DesKit plugin entry, ListView rendering and clipboard handling
  random.ts       Core logic: parsing, validation, generation and formatting
  random.test.ts  Unit tests for core logic
```

## Related Repositories

* DesKit: https://github.com/WiIIiamWei/DesKit
* Plugin template: https://github.com/WiIIiamWei/deskit-plugin-template
* DesKit Marketplace: https://github.com/WiIIiamWei/DesKit-Marketplace
