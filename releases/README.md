# Releases

This folder contains pre-built `.vsix` packages of the extension for direct
installation without going through the VS Code marketplace.

## Security Policy

Only code revisions that have been through a full security review should result
in a release build. Do not package a `.vsix` from unreviewed commits. Every
release filename encodes the source commit hash so the build can be traced back
to the exact reviewed revision.

## Naming Convention

Release files follow the format:

```text
opencode-enhanced-ui-<version>-<date>-<commit>.vsix
```

- **version** -- the semver version from `package.json` (e.g. `0.1.3`)
- **date** -- build date as `YYYYMMDD` (e.g. `20260421`)
- **commit** -- the 7-character short hash of the git HEAD used to build

Example: `opencode-enhanced-ui-0.1.3-20260421-ef19e20.vsix`

## How to Build

Prerequisites: `bun` (see `packageManager` in `package.json`) and `npx`.

```bash
# 1. Install dependencies
bun install

# 2. Type-check, lint, and produce a production bundle
bun run package

# 3. Package into a .vsix file
npx @vscode/vsce package --no-dependencies

# 4. Move into releases/ with the correct name
VERSION=$(node -p "require('./package.json').version")
DATE=$(date +%Y%m%d)
HASH=$(git rev-parse --short HEAD)
mkdir -p releases
mv "opencode-enhanced-ui-${VERSION}.vsix" \
   "releases/opencode-enhanced-ui-${VERSION}-${DATE}-${HASH}.vsix"
```

## How to Install

From a local file:

```bash
code --install-extension releases/opencode-enhanced-ui-*.vsix
```

From the GitHub raw URL after pushing:

```bash
code --install-extension "https://github.com/<owner>/opencode-enhanced-ui/raw/main/releases/<filename>.vsix"
```

Or download first, then install:

```bash
curl -L -o extension.vsix "https://github.com/<owner>/opencode-enhanced-ui/raw/main/releases/<filename>.vsix"
code --install-extension extension.vsix
```
