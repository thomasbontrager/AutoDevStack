# Contributing to AutoDevStack

Thank you for considering contributing to AutoDevStack! 🎉

## How to Contribute

### Adding a New Stack Template

1. Create a new folder under `templates/<stack-name>/` with a minimal working project:
   - `package.json` — with `name`, `scripts`, and relevant dependencies
   - Source files (e.g., `src/index.ts`, `pages/index.tsx`)
   - Config files (e.g., `tsconfig.json`, framework config)
   - `_gitignore` — will be renamed to `.gitignore` on scaffold

2. Register your stack in `cli/index.js`:
   ```js
   const stacks = {
     // ... existing stacks
     "My New Stack": "my-stack-template-folder",
   };
   ```

3. Test it locally:
   ```bash
   node cli/index.js
   # Choose your new stack and verify the output project works
   ```

### Improving the CLI

- Keep the UX consistent: use the existing `ora`, `chalk`, and `inquirer` patterns
- Handle edge cases (empty input, existing folders, missing templates)
- Write clear, descriptive commit messages

## Development Setup

```bash
git clone https://github.com/thomasbontrager/AutoDevStack.git
cd AutoDevStack
npm install
node cli/index.js
```

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Describe what your PR does and why
- Test your changes before submitting

## Code of Conduct

Be kind and respectful. We're all here to build cool things together. 🚀
