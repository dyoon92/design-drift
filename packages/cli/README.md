# @catchdrift/cli

CLI for [Drift](https://catchdrift.ai) — install, check, and manage design system coverage for any React app.

## Usage

```bash
npx catchdrift init       # Install Drift into your React project
npx catchdrift sync       # Auto-discover DS components from your package or path
npx catchdrift check      # Run a headless drift scan (requires running app)
npx catchdrift status     # Show DS coverage snapshot from config
npx catchdrift spec       # List and validate drift specs
```

## Install into a project

```bash
npx catchdrift init
```

Walks you through setup in ~2 minutes:
- Asks where your DS lives (Figma / Storybook / npm package / manual)
- Writes `drift.config.ts`
- Writes AI rules files (`CLAUDE.md`, `.cursorrules`, `.windsurfrules`)
- Patches your app entry point with `<DriftOverlay>`
- Adds a GitHub Actions drift check workflow

## Auto-discover components

If your DS is an npm package (e.g. `@acme/ui`) or a local path (e.g. `./src/components`), set `dsPackages` in `drift.config.ts` and run:

```bash
npx catchdrift sync
```

Scans your source for imports from those packages and populates `components` automatically.

## CI check

```bash
npx catchdrift check --url http://localhost:5173 --threshold 80
```

Runs a headless Playwright scan, exits 1 if coverage is below threshold. Use in GitHub Actions:

```yaml
- run: npx catchdrift check --url http://localhost:4173 --threshold 80
```

## Requirements

- Node 18+
- React 18+
- A running app URL for `catchdrift check`

## Links

- [catchdrift.ai](https://catchdrift.ai)
- [npm: @catchdrift/overlay](https://www.npmjs.com/package/@catchdrift/overlay)
- [Issues](https://github.com/dyoon92/design-drift/issues)

MIT License © Dave Yoon
