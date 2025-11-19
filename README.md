# Pankai public registry

A public registry for AI model providers, organized by provider with URL-based references for easy distribution via GitHub Pages.

## Architecture

The registry is split into provider-specific files for better maintainability and scalability:

```
/
  registry.json          # Main registry with provider references
  providers/
    llama.json          # Llama provider configuration
    anthropic.json      # Anthropic provider configuration
  schemas/
    registry.schema.json    # Schema for main registry
    provider.schema.json    # Schema for provider files
  scripts/
    validate.ts         # Validation script
```

## Structure

### Provider Files (`providers/*.json`)

Each provider has its own JSON file containing:

- `provider`: Provider identifier
- `type`: Either `"local"` (for local models) or `"remote"` (for API-based providers)
- `models`: Array of models (for local providers)
- `api`: Array of API endpoints (for remote providers)

## Validation

Validate the registry locally:

```bash
deno task validate
# or
deno run --allow-read scripts/validate.ts
```

> **Note:** You need to have [Deno installed](https://deno.land). No `npm install` or `node_modules` required!

The validation script:

- Validates the main `registry.json` against its schema
- Validates all provider files in `providers/` directory
- Verifies that all referenced providers have corresponding files

## Adding a New Provider

1. Create a new file in `providers/` directory (e.g., `providers/openai.json`)
2. Follow the `provider.schema.json` schema
3. Add a reference to the new provider in `registry.json`:
   ```json
   {
     "provider": "openai",
     "url": "https://mavdol.github.io/pankai-public-registry/providers/openai.json"
   }
   ```
4. Run validation to ensure everything is correct

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a branch: `git checkout -b feature/amazing-provider`
3. **Open** a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
