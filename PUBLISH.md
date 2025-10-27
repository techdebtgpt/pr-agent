# Publishing pr-agent to npm

## Prerequisites

1. **npm account**: Create one at [npmjs.com](https://www.npmjs.com/signup) if you don't have one
2. **Login**: Run `npm login` in your terminal

## Publishing Steps

### 1. Check Package Name Availability

The package name `pr-agent` might be taken. Check availability:
```bash
npm search pr-agent
```

If taken, update the name in `package.json` to something unique like:
- `pr-agent-cli`
- `@yourusername/pr-agent`
- `pr-analyzer-tool`

### 2. Prepare for Publishing

Make sure you have:
- Built the project: `npm run build`
- Updated `package.json` with correct metadata (author, repository, etc.)

Update author field in `package.json`:
```json
"author": "Your Name <your-email@example.com>"
```

Optionally add repository:
```json
"repository": {
  "type": "git",
  "url": "https://github.com/yourusername/pr-agent.git"
}
```

### 3. Test Locally (Recommended)

Test the package locally before publishing:
```bash
npm pack
```

This creates a `.tgz` file. Install it locally:
```bash
npm install -g ./pr-agent-0.1.0.tgz
```

Test the CLI:
```bash
pr-agent --help
```

### 4. Publish to npm

**Dry run (see what would be published):**
```bash
npm publish --dry-run
```

**Actual publish:**
```bash
npm publish
```

For scoped packages (e.g., `@yourusername/pr-agent`), publish with access:
```bash
npm publish --access public
```

### 5. Verify Publication

1. Go to [npmjs.com/package/pr-agent](https://www.npmjs.com/package/pr-agent)
2. Check your package page

### 6. Install and Test

Install globally:
```bash
npm install -g pr-agent
```

Test it:
```bash
pr-agent --analyze --summary
```

## Important Notes

- **Version bumping**: When you make changes, update the version in `package.json`
- **npm versioning**: Use `npm version patch|minor|major` to bump versions
- **Unpublishing**: Avoid it if possible. Use `npm deprecate` instead
- **Rate limits**: Free accounts have limitations on publishing frequency

## After Publishing

### Installation Instructions

Users can install with:
```bash
npm install -g pr-agent
```

Or as a dev dependency:
```bash
npm install pr-agent --save-dev
```

Then use:
```bash
npx pr-agent --analyze --full
```

## Updating the Package

When you need to update:

1. Make your changes
2. Bump version: `npm version patch` (or `minor`/`major`)
3. Build: `npm run build`
4. Publish: `npm publish`

## Troubleshooting

### Name Already Taken
Change the package name in `package.json`

### Authentication Error
Login again: `npm login`

### Permission Denied
Check if you're logged in with the correct account

### Build Failed
Run `npm run build` manually before publishing
