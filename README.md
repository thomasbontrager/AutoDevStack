# AutoDevStack

🚀 **Generate full dev stacks instantly!** Scaffold React, Node, Next.js, and T3 Stack templates in seconds — no more boilerplate headaches.

## Demo

> Run the CLI and follow the prompts to scaffold your project in seconds.

```
🚀 Welcome to AutoDevStack! 🚀
Scaffold your next project in seconds.

? Project name: my-app
? Choose a stack:
  ❯ React + TypeScript + Vite
    Node + Express + TypeScript
    Next.js
    T3 Stack (Next.js + Tailwind + tRPC + Prisma)

⠋ Creating project "my-app"...
✔ Project "my-app" created successfully!

✨ Stack: React + TypeScript + Vite

Next steps:
  cd my-app
  npm install
  npm run dev

Happy coding! 🎉
```

## Quick Start

```bash
# Clone the repo
git clone https://github.com/thomasbontrager/AutoDevStack.git
cd AutoDevStack
npm install
chmod +x index.js
node index.js
```

Or use it globally after linking:

```bash
npm link
autodevstack
```

## Supported Stacks

| Stack | Template | Description |
|-------|----------|-------------|
| React + TypeScript + Vite | `default` | Fast React SPA with Vite bundler |
| Node + Express + TypeScript | `node` | REST API server with Express |
| Next.js | `next` | Full-stack React framework |
| T3 Stack | `t3` | Next.js + Tailwind + tRPC + Prisma |

## Contributing

We'd love your help! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-stack`)
3. Add your template under `templates/<name>/`
4. Register it in `index.js`
5. Submit a PR 🎉

## Future Roadmap

- [ ] SvelteKit template
- [ ] Remix template
- [ ] NestJS template
- [ ] Docker support for all stacks
- [ ] Interactive stack configuration (database choice, auth, etc.)
- [ ] `npm init autodevstack` support
- [ ] Published to npm registry

Star this repo if it saves you time! ⭐

## License

MIT — see [LICENSE](LICENSE)
