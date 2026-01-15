# ycms

[![Install biome extension in your IDE for lint support](https://img.shields.io/badge/Install-Biome%20Extension-blue?style=for-the-badge&logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemname=biomejs.biome)

## docs

- [How to manage CMS metadata schemas](docs/how-to-manage-cms-metadata-schemas.md)

## lfg

```bash

cp packages/app/.env.example packages/app/.env
# configure packages/app/.env

```

```bash

bun clean [--lockfiles]
bun install
bun dev

```

#### Manual vault and strategy sync
```bash

act -j sync-vaults
# see https://github.com/nektos/act

```

or

```bash

bun packages/app/scripts/sync-vaults.ts
bun packages/app/scripts/sync-strategies.ts
bun packages/app/scripts/sync-tokens.ts
git add packages/app/cdn/vaults
git add packages/app/cdn/strategies
git add packages/app/cdn/tokens
git commit -m 'Sync vaults strategies and tokens'
git push

```

### cdn url

```url

https://cdn.jsdelivr.net/gh/yearn/cms@main/packages/cdn

```