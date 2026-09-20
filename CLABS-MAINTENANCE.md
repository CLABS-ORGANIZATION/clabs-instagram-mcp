# CLABS maintenance

## Upstream synchronization

- `origin` is `CLABS-ORGANIZATION/clabs-instagram-mcp`; `upstream` is
  `IvanBBaev/instagram-mcp`.
- Fetch `upstream` before each maintenance change, compare its `main` branch
  with the CLABS default branch, and record the selected commit in the pilot
  evidence.
- Keep CLABS changes limited to security, reproducibility and explicitly
  approved operational controls. Do not mix Facebook Pages or Meta Ads code
  into this repository.
- Run `npm ci`, `npm run lint`, `npm run format:check`, `npm run build`,
  `npm run coverage` and `npm run audit` before proposing an update.
- Rebase or merge upstream changes only through a reviewed change; preserve
  this policy and never commit credentials, local profiles or write journals.
