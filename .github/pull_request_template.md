## What this changes

<!-- One app, one agent or one fix per pull request keeps reviews fast. -->

## Checklist

- [ ] `npm test` passes
- [ ] `npm run validate` passes
- [ ] For a new or changed app: the network check rejects fake credentials
      (`node scripts/validate-catalog.mjs src/catalog/apps/<file>.js --only <app id>`) and the logo is generated
      (`npm run logos -- <app id>`)
- [ ] No tokens, keys or personal data in the code, tests or screenshots
