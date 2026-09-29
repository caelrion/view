# Caelrion View

Hosted at **https://view.caelrion.com** from this repository (God's Eye View open source).

| Branch | Role |
|--------|------|
| `main` | Production pin |
| `dev` | Integration / day-to-day |

## Deploy (this host)

Static build → `/opt/caelrion/core/view/dist` (Caddy `/srv/view/dist`). No Caelrion BFF.

```bash
# Node 24 required (use Docker if host Node < 24)
docker run --rm -v "$PWD":/app -w /app node:24-bookworm-slim \
  bash -lc 'npm ci && npm run build'
rsync -a --delete dist/ /opt/caelrion/core/view/dist/
```

Upstream: https://github.com/bilawalsidhu/gods-eye-view
