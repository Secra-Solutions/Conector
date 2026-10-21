# Contributing to Conector

Thanks for helping. Issues and pull requests are welcome, from typo fixes to new apps and agent install guides.
If you're looking for a place to start, the
[good first issues](https://github.com/Secra-Solutions/Conector/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
are apps we want in the catalog, each with a link to its API documentation. Questions and ideas go to
[Discussions](https://github.com/Secra-Solutions/Conector/discussions).

Everyone taking part follows our [code of conduct](CODE_OF_CONDUCT.md).

## Getting started

```bash
git clone https://github.com/Secra-Solutions/Conector.git
cd Conector
npm install
CONECTOR_PORT=8790 npm run dev
```

Use a separate data directory while you develop (`CONECTOR_DATA_DIR=/tmp/conector-dev`), so tests and experiments never
touch real credentials.

## Before you open a pull request

```bash
npm test                 # unit and end-to-end tests
npm run validate         # every app definition, offline
```

If you added or changed an app, also run the network check for its file. It calls the app's API with fake credentials,
and the app should reject them (usually 401 or 403):

```bash
node scripts/validate-catalog.mjs src/catalog/apps/<file>.js --only <app id>
npm run logos -- <app id>
```

## What makes a good contribution

- **New apps:** follow [docs/ADDING_APPS.md](docs/ADDING_APPS.md). Prefer the simplest way to connect (OAuth when the
  provider supports it, otherwise an API key), write help text that leads the user to the key in a few numbered
  steps, and add a connection test that proves the credentials work.
- **Agent install guides** live in `src/agents.json`. Link the agent's official MCP documentation and test the snippet
  with a real install.
- **Security issues:** please don't open a public issue. See [SECURITY.md](SECURITY.md).
- **Run validation first:** if you add or change an app, run `node scripts/validate-catalog.mjs src/catalog/apps/<file>.js --only <app id>` to confirm the API rejects fake credentials before submitting.

Keep pull requests focused: one app, one agent or one fix per pull request makes reviews fast.

## License

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE).
# Contributing Tips

Quick tip: when adding new apps, run the validation script first to confirm the API rejects fake credentials. This saves maintainers time during review.

See the contributing guide for details.
