# 100.105.31.42 Server Master Guide & Workspace Prompt

> **Living Document + Master AI Prompt**  
> This file is the single source of truth for this Ubuntu/Tailscale/Docker server and the authoritative reference for all AI workspaces that interact with it.

**Last Updated**: March 11, 2026  
**Version**: 2.13  
**Maintainer**: yancmo  
**Server Hostname**: ubuntumac

# Symlink Server_Master_Guide From any app repo on the server
ln -sf /Users/yancyshepherd/Projects/ubuntumac-server/SERVER_MASTER_GUIDE.md

# Symlink Subagent Creation from any app repo on the server
ln -sf /Users/yancyshepherd/Projects/ubuntumac-server/subagent-creation.md ./subagent-creation.md

---

## 🤖 Agent Workflow (Subagents)

Canonical subagent files live in `~/dotfiles/agents/`. After editing any agent, push to all repos with:

```bash
~/dotfiles/agents/sync-agents.sh
```

### Agents included

| Agent | Role |
|---|---|
| `Atlas.agent.md` | Orchestrator — runs the full workflow end-to-end |
| `Prometheus.agent.md` | Higher-level planner — produces phased plans, hands off to Atlas |
| `Scout-subagent.agent.md` | Read-only discovery — finds files, patterns, constraints |
| `Planner-subagent.agent.md` | Scoped planner — acceptance criteria + 3–7 phases |
| `Implementer-subagent.agent.md` | Implementer — one phase at a time, minimal diffs |
| `Reviewer-subagent.agent.md` | Reviewer — approves/blocks against acceptance criteria |
| `Designer-subagent.agent.md` | UI/UX polish — layout, spacing, accessibility, responsiveness |

### Atlas workflow (strict)

```
SCOUT → PLAN (stop, wait for approval)
      → SECOND OPINION (no code, record to docs/reviews/)
      → IMPLEMENT phased (lint/diff → "Commit this phase? yes/no")
      → REVIEW (per phase + final)
      → WRITEUP (stop, wait for approval)
      → CHANGELOG (update devChangelog.js)
```

### To update an agent across all repos

1. Edit the agent in `~/dotfiles/agents/<AgentName>.agent.md`
2. Run `~/dotfiles/agents/sync-agents.sh`
3. Reload VS Code windows

### To add a new repo to the sync

Edit the `REPOS` array in `~/dotfiles/agents/sync-agents.sh` and add the repo's absolute path.

### Feature kickoff template

`~/.github/prompts/feature-kickoff.md` (also synced to each repo at `.github/prompts/feature-kickoff.md`) — fill in objective + acceptance criteria and hand to `@Atlas`.

---

## 🧠 0. How AI Workspaces Should Use This File

This document is meant to be included in any AI workspace that needs to interact with, deploy to, or reason about this server.

### 0.1 Assistant Role

When an AI loads this file, it must:

- Treat it as the canonical description of server architecture
- Generate commands for the user to run — never assume direct shell access
- Provide best-practice recommendations, validation steps, and commands with explanations
- Propose updates to this document when infra changes

### 0.2 Cross-Workspace Behavior

Any app-specific workspace should:
1. Reference this file for server expectations
2. Never contradict it
3. Propose changes when new infra patterns emerge

---

## 📌 1. Document Maintenance

### 1.1 Update this file whenever:
- Docker networks or CIDRs change
- Services are added/removed/renamed
- Traefik routing changes
- iptables or Tailscale rules change
- Backup structure changes
- Deployment workflow changes
- New troubleshooting items are discovered

### 1.2 Symlink Across All Repositories
```bash
ln -s /path/to/SERVER_MASTER_GUIDE.md ./SERVER_MASTER_GUIDE.md
```

---

## 🖥️ 2. Server Overview

| Property | Value |
|----------|-------|
| **Tailscale IP** | `100.105.31.42` |
| **Hostname** | `ubuntumac` |
| **OS** | Ubuntu 24.04.3 LTS |
| **Kernel** | 6.8.0-87-generic |
| **Docker** | v29.1.5 (API 1.52) |
| **Primary User** | `yancmo` (sudoer) |
| **CPU** | Intel Core i7-8750H @ 2.20GHz (6 cores, 12 threads) |
| **RAM** | 16GB |
| **Root Disk** | 98GB (69GB used, 25GB available - 74% usage) |

### SSH Access
```bash
# Preferred (MagicDNS + SSH alias)
ssh ubuntumac

# Fallbacks (manual use if DNS hiccups)
ssh ubuntumac-ip    # Tailscale IP
ssh ubuntumac-lan   # LAN IP (if on local network)

# Direct (not preferred)
ssh yancmo@100.105.31.42
```

### Directory Structure
```
/opt/
├── apps/
│   ├── apps/                      # App repositories (Git clones)
│   │   ├── bingebox/              # BingeBox app
│   │   ├── coc-discord-bot/       # COC Discord Bot
│   │   └── watchsteps-website/    # WatchSteps static site
│   ├── assistant-365-bridge/      # Microsoft 365 bridge app
│   ├── bingebox/                  # Legacy location
│   ├── logs/                      # Application logs
│   │   ├── bingebox/
│   │   ├── coc-bot/
│   │   └── ghcr-auto-deploy.log
│   └── scripts/
│       └── ghcr-auto-deploy.sh    # Auto-deployment script
├── containerd/
└── infra-new/                     # Primary infrastructure
    ├── compose/
    │   ├── docker-compose.yml     # Main orchestration
    │   └── .env                   # Environment config
    └── traefik/
        ├── acme/
        ├── acme.json
        └── dynamic/

/home/yancmo/
├── apps/                          # App data directories
│   ├── bingebox/
│   │   ├── .env
│   │   └── data/
│   ├── coc-discord-bot/
│   │   └── data/
│   ├── jackett/
│   │   ├── config/
│   │   └── downloads/
│   └── logs/
├── infra/traefik/dynamic/         # Traefik dynamic config
├── .cloudflared/                  # Cloudflare tunnel creds
└── backup-apps.sh                 # Backup script

/mnt/
├── media/                         # 522GB media storage
│   ├── Movies/
│   ├── TV/
│   └── _incoming/
└── apps-backup/                   # 394GB backup storage
    ├── latest -> 2025-10-25_...
    └── 2025-10-25_13-43-26/
```

---

## 🌐 3. Network Architecture

### 3.1 Docker Networks

| Network | CIDR | Interface | Purpose |
|---------|------|-----------|---------|
| **edge** | `172.18.0.0/16` | `br-811a7ad8f564` | Public-facing services |
| **backend** | `172.19.0.0/16` | `br-ab5eb4ee7605` | Internal services |
| **docker0** | `172.17.0.0/16` | `docker0` | Default bridge |

### 3.2 Current Container Network Assignments

**Edge Network (172.18.0.0/16):**
| Container | IP |
|-----------|-----|
| infra-new-traefik-1 | 172.18.0.2 |
| infra-new-watchsteps-1 | 172.18.0.3 |
| infra-new-bingebox-1 | 172.18.0.4 |

**Backend Network (172.19.0.0/16):**
| Container | IP |
|-----------|-----|
| infra-new-bingebox-1 | 172.19.0.2 |
| infra-new-traefik-1 | 172.19.0.3 |
| infra-new-coc-bot-1 | 172.19.0.4 |
| infra-new-flaresolverr-1 | 172.19.0.5 |
| infra-new-jackett-1 | 172.19.0.6 |
| infra-new-cocstack-db-1 | 172.19.0.7 |

### 3.3 Network Assignment Pattern
```yaml
services:
  my-service:
    networks:
      - edge       # If public-facing (needs Traefik)
      - backend    # If needs DB/internal services
```

### 3.4 Traefik Reverse Proxy

- **Container**: `infra-new-traefik-1`
- **Version**: Traefik v3.6 (updated Jan 22, 2026)
- **Ports**: 80 (HTTP), 443 (HTTPS), 8080 (Dashboard)
- **Networks**: edge, backend
- **TLS**: Traefik ACME DNS-01 via Cloudflare (`certificatesResolvers.cloudflare`) for `yancmo.xyz` + `*.yancmo.xyz` (active as of 2026-03-11)
- **Dynamic Config**: `/home/yancmo/infra/traefik/dynamic/`

#### 3.4.1 Traefik Version & Docker API Compatibility

| Component | Version | Notes |
|-----------|---------|-------|
| Traefik | v3.6 | Updated Jan 22, 2026 for Docker API 1.52 compatibility |
| Docker API | 1.52 | Server API version (Docker 29.1.5) |
| Min Traefik | v3.6+ | Traefik v3.1 and earlier incompatible with Docker API 1.44+ |

**Critical**: After Docker updates, check Traefik logs for "client version X.XX is too old" errors indicating API version mismatch.

**Network Requirements**: Traefik MUST be connected to both `edge` and `backend` networks:
```yaml
services:
  traefik:
    image: traefik:v3.6
    networks:
      - edge
      - backend
```

**After Docker Updates - Recovery Steps**: 
1. Check Traefik logs: `sudo docker logs infra-new-traefik-1 --tail 20 | grep -i error`
2. Update Traefik image in `/opt/infra-new/compose/docker-compose.yml`
3. Recreate Traefik: `cd /opt/infra-new/compose && sudo docker compose up -d --force-recreate traefik`
4. Verify networks: `sudo docker inspect infra-new-traefik-1 --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'`
5. Should show: `backend edge` (or similar)
6. Test routing: `curl -skI https://localhost -H "Host: dashboard.yancmo.xyz"`

**Traefik Labels Pattern:**
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=edge"
  - "traefik.http.routers.myapp.rule=Host(`${MYAPP_HOST}`)"
  - "traefik.http.routers.myapp.entrypoints=websecure"
  - "traefik.http.routers.myapp.tls=true"
  - "traefik.http.services.myapp.loadbalancer.server.port=8080"
```

---

## 🐳 4. Docker & Container Configuration

### 4.1 Compose Project

- **Project Name**: `infra-new`
- **Compose Directory**: `/opt/infra-new/compose`
- **Environment File**: `/opt/infra-new/compose/.env`

### 4.2 Active Containers (as of Jan 22, 2026)

| Container | Image | Status | Ports | Networks |
|-----------|-------|--------|-------|----------|
| `infra-new-traefik-1` | traefik:v3.6 | healthy | 80, 443, 8080 | edge, backend |
| `infra-new-cloudflared-1` | cloudflare/cloudflared:latest | healthy* | host network | - |
| `infra-new-watchsteps-1` | nginx:alpine | healthy | 80 (internal) | edge |
| `infra-new-bingebox-1` | ghcr.io/shepswork/bingebox:latest | healthy | 8081 | edge, backend |
| `infra-new-clan-map-1` | ghcr.io/shepswork/clan-map:latest | healthy | 5552 | edge, backend |
| `infra-new-stridelog-weather-1` | compose-stridelog-weather | healthy | 5562 (internal) | edge |
| `infra-new-training-lms-1` | ghcr.io/yancygcg/training-lms:latest | healthy | 6001-6002 (internal) | edge, backend |
| `infra-new-lms-postgres-1` | postgres:15 | healthy | 5432 (internal) | backend |
| `infra-new-coc-bot-1` | ghcr.io/shepswork/coc-discord-bot:latest | healthy | - | backend |
| `infra-new-jackett-1` | lscr.io/linuxserver/jackett:latest | healthy | 9117 | backend |
| `infra-new-flaresolverr-1` | ghcr.io/flaresolverr/flaresolverr:latest | healthy | 8191 | backend |
| `infra-new-cocstack-db-1` | postgres:15 | healthy | 5432 (internal) | backend |
| `infra-new-crumb-postgres-1` | postgres:15 | healthy | 5432 (internal) | backend |
| `infra-new-crumb-1` | ghcr.io/shepswork/crumb-recipe-pwa:latest | healthy | 5554 (internal) | edge, backend |
| `infra-new-pihole-1` | pihole/pihole:latest | healthy | 100.105.31.42:53 (TCP/UDP), 100.105.31.42:8082 (HTTP) | backend |
| `infra-new-prometheus-1` | prom/prometheus:v2.54.1 | healthy | 9090 (internal) | backend |
| `infra-new-grafana-1` | grafana/grafana:latest | healthy | 3000 (internal) | edge, backend |
| `infra-new-loki-1` | grafana/loki:3 | healthy** | 3100 (internal) | backend |
| `infra-new-promtail-1` | grafana/promtail:3 | healthy** | - | backend |
| `infra-new-node-exporter-1` | prom/node-exporter:latest | healthy | 9100 (internal) | backend |
| `infra-new-cadvisor-1` | gcr.io/cadvisor/cadvisor:latest | healthy | 8080 (internal) | backend |
| `infra-new-portainer-1` | portainer/portainer-ce:latest | healthy** | 9000 (internal) | edge, backend |
| `infra-new-travel-postgres-1` | postgres:15-alpine | healthy | 5432 (internal) | backend |
| `infra-new-travel-backend-1` | ghcr.io/shepswork/travel-journal-backend:latest | healthy | 4000 (internal) | edge, backend |
| `infra-new-travel-frontend-1` | ghcr.io/shepswork/travel-journal-frontend:latest | healthy | 80 (internal) | edge |
| `infra-new-minidlna-1` | vladgh/minidlna:latest | healthy | 8200, 1900 (SSDP) | host network |
| `infra-new-jellyfin-1` | jellyfin/jellyfin:latest | healthy | 8096 (HTTP), 8920 (HTTPS, optional), DLNA/SSDP | host network (recommended)

*Cloudflared health may flap depending on the healthcheck implementation; treat the tunnel as working if logs show "Registered tunnel connection".

**Promtail/Loki may show unhealthy during log rejection of old entries. Portainer has no curl/wget so healthcheck fails but service works.

### 4.2.1 Training LMS (infra-new-training-lms-1)

### 4.2.0 Jellyfin Media Server (infra-new-jellyfin-1)

- **Image**: `jellyfin/jellyfin:latest`
- **Container**: `infra-new-jellyfin-1`
- **Purpose**: Media server for user-facing metadata UI and DLNA/Play‑To support (mobile apps, TVs).
- **Network**: runs in **host network mode** (`network_mode: host`) so the DLNA plugin and SSDP discovery work reliably on the LAN.
- **Data paths**:
  - Config/DB/Cache: `/home/yancmo/apps/jellyfin` (persisted)
  - Media mount: `/mnt/media` (read-only)
- **Ports** (host): `8096` (HTTP), `8920` (HTTPS if enabled) — these are bound on the host when `network_mode: host`.
- **DLNA**: Jellyfin DLNA plugin installed (logs show `Jellyfin.Plugin.Dlna` loaded). A separate `minidlna` service (`infra-new-minidlna-1`) is also deployed as a fallback DLNA server and runs on host network.
- **Database**: SQLite located at `/home/yancmo/apps/jellyfin/data/jellyfin.db`. Backups/edits (e.g., setting `Users.CastReceiverId`) were performed; backups are created as `/home/yancmo/apps/jellyfin/data/jellyfin.db.bak.<timestamp>` before changes.

#### Public access (jellyfin.yancmo.xyz)

Two supported options to publish Jellyfin publicly from this host are documented below. You have already created the DNS record in Cloudflare; choose the option that fits your routing setup.

Option A — Cloudflare Tunnel (recommended, preserves host networking)
- Use when Jellyfin runs in host network_mode (current setup) and you want a quick, secure public route without changing compose or Traefik.
- Steps:
  1. In the Cloudflare dashboard, create a Tunnel (Cloudflare Zero Trust / Access → Tunnels) or use an existing `cloudflared` tunnel on the host.
  2. Add an ingress route that maps `https://jellyfin.yancmo.xyz` to the origin URL `http://localhost:8096` (or `https://localhost:8096` if you're terminating TLS locally). Example ingress rule in `config.yml`:

```yaml
ingress:
  - hostname: jellyfin.yancmo.xyz
    service: http://localhost:8096
  - service: http_status:404
```

  3. If using `cloudflared` service on the host, restart it after updating `config.yml`.
  4. In Cloudflare DNS for `yancmo.xyz` ensure the `A`/`CNAME` for `jellyfin` is proxied (orange cloud) if you want Cloudflare to front the traffic; the Tunnel will work without a proxied record if you use the Tunnel's `hostnames` feature.
  5. Test: from outside your LAN run `curl -I https://jellyfin.yancmo.xyz` — you should receive a 200 or a redirect to the Jellyfin web UI.

Notes & TLS:
- When mapping to `http://localhost:8096` Cloudflare will terminate TLS at the edge and speak plain HTTP to the origin — this is acceptable for a private host but consider `service: https://localhost:8096` with `originRequest` `noTLSVerify: true` if you prefer TLS between Cloudflare and the origin.

Option B — Traefik (longer-term, integrates with existing ingress)
- Use when you want Jellyfin routed through the Traefik instance (recommended for consolidated ingress and certs) and you are willing to run Jellyfin on a Docker network attached to Traefik instead of host network.
- Steps:
  1. Revert Jellyfin to bridge/network_mode `edge` in `/opt/infra-new/compose/docker-compose.yml` and add Traefik labels:

```
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.jellyfin.rule=Host(`jellyfin.yancmo.xyz`)"
  - "traefik.http.routers.jellyfin.entrypoints=websecure"
  - "traefik.http.routers.jellyfin.tls.certresolver=le"
```

  2. Recreate the service and ensure Traefik's `edge` network is attached to the Jellyfin service.
  3. Confirm Traefik obtains a certificate and routes traffic to the container by visiting `https://jellyfin.yancmo.xyz`.

Tradeoffs:
- Option A preserves DLNA/SSDP host networking and is the safest quick path.
- Option B centralizes ingress but requires losing host networking for Jellyfin (may impact DLNA discovery) or additional network workarounds (macvlan, host aliases).

Rollback:
- For Option A: remove the ingress rule and restore previous `cloudflared` config; flush DNS TTLs as needed.
- For Option B: restore the compose backup `/opt/infra-new/compose/docker-compose.yml.bak.manual.*` and recreate the jellyfin service.

Runbook — common operations

- Restart Jellyfin (safe):
```bash
cd /opt/infra-new/compose
sudo docker compose -p infra-new up -d --no-deps --force-recreate jellyfin
```

- View logs (tail):
```bash
sudo docker logs infra-new-jellyfin-1 --tail 200 -f
```

- Inspect DLNA/SSDP registration entries (example grep):
```bash
sudo docker logs infra-new-jellyfin-1 --tail 200 | grep -iE 'dlna|ssdp|Registering publisher|PlayTo'
```

- Backup DB (manual):
```bash
sudo cp /home/yancmo/apps/jellyfin/data/jellyfin.db /home/yancmo/apps/jellyfin/data/jellyfin.db.bak.$(date +%Y%m%d-%H%M%S)
```

- Rollback compose change (if you revert to bridge networks):
```bash
sudo cp /opt/infra-new/compose/docker-compose.yml.bak.manual.<timestamp> /opt/infra-new/compose/docker-compose.yml
cd /opt/infra-new/compose
sudo docker compose -p infra-new up -d --no-deps --force-recreate jellyfin
```

Notes and operational context

- Host networking: Jellyfin was moved to host networking to permit SSDP/UPnP discovery of LAN devices (LG webOS TV, etc.). This makes DLNA discovery reliable but means Traefik labels on the service may not affect traffic as before — Traefik routing will continue to work if requests arrive on the host and Traefik routes by Host header, but container-level network isolation is reduced.
- Device defaulting: A Devices DB row for the LG TV was added and the `Users.CastReceiverId` for user `root` was set to that device id (DeviceId `LG-64E4A587A727`) to offer a server-side default for Play‑To. The DB was backed up prior to change.
- Fallback DLNA: `infra-new-minidlna-1` is kept running on the host network as a simple, robust DLNA server (minidlna status page on port 8200 shows connected clients).
- Security: host networking increases exposure to host networking conflicts — ensure no other service claims ports 8096/8920 on the host. Running Jellyfin on host mode bypasses Docker network isolation; treat binds as host binds in any firewall/iptables checks.


- **Compose service**: `training-lms` (in `/opt/infra-new/compose/docker-compose.yml`)
- **Public URL**: `https://dev-lms.yancmo.xyz`
- **Health**: `https://dev-lms.yancmo.xyz/api/health`

Operational notes (Feb 18, 2026 incident):
- `training-lms` on `:dev` uses runtime secrets bootstrap (`/app/scripts/bootstrap-secrets.sh`) and may source DB credentials from `/tmp/.secrets_env`.
- Ensure `training-lms.environment` includes `POSTGRES_PASSWORD=${LMS_DB_PASS}` so runtime bootstrap can build/use DB URL from expected compose vars.
- If LMS is unhealthy with Postgres auth errors (`password authentication failed for user lmsapp`), first confirm `lms-postgres` is running, then sync DB role password to runtime secret source and recreate only `training-lms`.

Targeted recovery runbook:
```bash
cd /opt/infra-new/compose

# 1) Ensure DB container is up
sudo docker start infra-new-lms-postgres-1 || true

# 2) Sync lmsapp DB password to runtime secret source used by the dev container
bash /opt/apps/apps/ubuntumac-server/ops/server_sync_lms_db_to_runtime_secret.sh

# 3) Verify
curl -sk -o /dev/null -w '%{http_code}\n' https://localhost/api/health -H 'Host: dev-lms.yancmo.xyz'
```

Environment variables are defined in the Compose service under `training-lms.environment:` (do not record secrets here).

Key toggles:
- `LMS_BUG_FORWARD_TO_FLOW=true` (enable forwarding LMS bug reports to the configured Flow)

### 4.2.2 BingeBox (infra-new-bingebox-1)

- **Compose service**: `bingebox` (in `/opt/infra-new/compose/docker-compose.yml`)
- **Public URL**: `https://binge.yancmo.xyz`
- **Health**: `https://binge.yancmo.xyz/api/health`
- **Host port**: `8081` → container `8081`
- **Env file** (server): `/home/yancmo/apps/bingebox/.env` (do not record secrets here)

#### Daily Email Report (downloads + errors)

- **Schedule**: **12:00 PM CST (America/Chicago)** (daily)
- **Configured in app code** (built into the image on the server):
  - `/opt/apps/apps/bingebox/services/rdsvc/main.py`
  - Scheduler line: `start_daily_report_scheduler(report_time_cst=time(12, 0))`

Verify the schedule from logs:
```bash
docker logs infra-new-bingebox-1 --tail 250 | grep -i "daily report scheduler\|next daily report"
```

### 4.2.3 Travel Journal (infra-new-travel-*)

- **Compose services**: `travel-frontend`, `travel-backend`, `travel-postgres`
- **Public URL**: `https://travel.yancmo.xyz`
- **Health**: `https://travel.yancmo.xyz/api/health`
- **Repository**: https://github.com/yancmo1/travel-journal
- **Architecture**: React + Nginx (frontend), Node.js + Express (backend), PostgreSQL 15
- **GHCR Images**: 
  - Frontend: `ghcr.io/shepswork/travel-journal-frontend:latest`
  - Backend: `ghcr.io/shepswork/travel-journal-backend:latest`

#### Purpose
Full-stack travel journaling application with photo intelligence, EXIF data extraction, location clustering, and analytics dashboard. Users can track trips, upload photos with automatic location extraction, and view comprehensive travel statistics.

#### Containers
- **travel-frontend**: React SPA served by Nginx, proxies API requests to backend (port 80 internal)
- **travel-backend**: Node.js Express API, handles auth, photos, trips, EXIF parsing (port 4000 internal)
- **travel-postgres**: PostgreSQL 15 database with tables for users, travelers, trips, photos, location clusters (port 5432 internal)

#### Environment Variables
Set in `/opt/infra-new/compose/.env`:
```bash
TRAVEL_HOST=travel.yancmo.xyz
TRAVEL_POSTGRES_DB=travel_tracker
TRAVEL_POSTGRES_USER=travel_user
TRAVEL_POSTGRES_PASSWORD=<secure-password>
TRAVEL_JWT_SECRET=<jwt-secret>
TRAVEL_HOME_LATITUDE=35.4676
TRAVEL_HOME_LONGITUDE=-97.5164
```

Generate secrets:
```bash
# JWT Secret
openssl rand -base64 32

# Database Password
openssl rand -base64 24
```

#### Data Persistence
- **Database**: Docker volume `travel_postgres_data`
- **Photos**: Docker volume `travel_photos` (mapped to `/app/uploads` in backend)

#### Deployment
Deployed via GHCR auto-deploy workflow:
1. GitHub Actions builds and pushes images on commit to `travel-journal` repo
2. Auto-deploy timer checks every 15 minutes
3. New images automatically pulled and deployed

Manual update:
```bash
cd /opt/infra-new/compose
sudo docker compose pull travel-frontend travel-backend
sudo docker compose up -d --force-recreate travel-frontend travel-backend
```

#### Verification Commands
```bash
# Check all travel services
docker ps | grep travel

# View logs
docker logs infra-new-travel-frontend-1 --tail 100
docker logs infra-new-travel-backend-1 --tail 100
docker logs infra-new-travel-postgres-1 --tail 100

# Test endpoints
curl -Ik https://travel.yancmo.xyz
curl https://travel.yancmo.xyz/api/health

# Database backup
docker exec infra-new-travel-postgres-1 \
  pg_dump -U travel_user travel_tracker > travel_backup_$(date +%Y%m%d).sql
```

#### Default Credentials
- **Demo User**: `demo` / `demo123`
- **Important**: Change or disable in production!

### 4.2.4 Crumb Recipe PWA (infra-new-crumb-*)

- **Compose services**: `crumb`, `crumb-postgres`
- **Public URL**: `https://crumb.yancmo.xyz`
- **Health**: `https://crumb.yancmo.xyz/api/health`
- **Repository**: `git@github.com:ShepsWork/crumb-recipe-pwa.git` (moved to ShepsWork org, Feb 2026)
- **Architecture**: Next.js (React) + PostgreSQL 15
- **GHCR Images**: 
  - App: `ghcr.io/shepswork/crumb-recipe-pwa:latest`

#### Purpose
Recipe management PWA for organizing, searching, and sharing personal recipes. Features include Markdown-based recipe editing, tagging, search, and offline support.

#### Containers
- **crumb**: Next.js application serving the PWA (port 5554 internal)
- **crumb-postgres**: PostgreSQL 15 database for recipes, tags, users (port 5432 internal)

#### Deployment
Deployed via GHCR auto-deploy workflow:
1. GitHub Actions builds and pushes image on commit to `crumb-recipe-pwa` repo
2. Auto-deploy timer checks every 15 minutes
3. New images automatically pulled and deployed

Manual update:
```bash
cd /opt/infra-new/compose
sudo docker compose pull crumb
sudo docker compose up -d --force-recreate crumb
```

#### Verification Commands
```bash
# Check Crumb services
docker ps | grep crumb

# View logs
docker logs infra-new-crumb-1 --tail 100
docker logs infra-new-crumb-postgres-1 --tail 100

# Test endpoints
curl -Ik https://crumb.yancmo.xyz
curl https://crumb.yancmo.xyz/api/health

# Database backup
docker exec infra-new-crumb-postgres-1 \
  pg_dump -U crumb crumb > crumb_backup_$(date +%Y%m%d).sql
```

### 4.3 Container Naming Convention
```
infra-new-<service>-1
```

### 4.4 Docker Volumes

| Volume | Container | Size |
|--------|-----------|------|
| `compose_cocstack_postgres_data` | cocstack-db | 48.26MB |
| `coc-discord-bot_cocstack_postgres_data` | orphaned | 0B |
| `travel_postgres_data` | travel-postgres | TBD |
| `travel_photos` | travel-backend | TBD (grows with usage) |

### 4.5 Standard Commands
```bash
# View all stack containers
docker ps | grep infra-new

# View logs
docker logs infra-new-<service>-1 --tail 100 -f

# Restart service
cd /opt/infra-new/compose
docker compose -p infra-new restart <service>

# Force recreate
docker compose -p infra-new up -d --force-recreate <service>

# Rebuild and deploy from repo
cd /opt/apps/apps/<app>
docker build -t ghcr.io/shepswork/<app>:latest .
cd /opt/infra-new/compose
docker compose -p infra-new up -d <service>
```

---

## 🔐 5. Tailscale Integration

| Property | Value |
|----------|-------|
| **Tailscale IP** | `100.105.31.42` |
| **Interface** | `tailscale0` |
| **Hostname** | `ubuntumac` |
| **Purpose** | SSH access + private admin services (e.g., Pi-hole dashboard/DNS) |

### Connected Devices
- `ubuntumac` (this server) - online
- `yancys-macbook-wired` - active
- Other devices offline

### Verification
```bash
tailscale status
tailscale ip -4
ip addr show tailscale0
```

---

## 🔥 6. iptables Configuration

### 6.1 Critical Rules for Docker + Tailscale Coexistence

The saved rules in `/etc/iptables/rules.v4` properly configure:

1. **ts-forward chain** - Docker network exceptions:
```
-A ts-forward -d 172.16.0.0/12 -j ACCEPT
-A ts-forward -s 172.16.0.0/12 -j ACCEPT
```

2. **POSTROUTING order** - Docker MASQUERADE before ts-postrouting:
```
-A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE
-A POSTROUTING -s 172.18.0.0/16 ! -o br-811a7ad8f564 -j MASQUERADE
-A POSTROUTING -s 172.19.0.0/16 ! -o br-ab5eb4ee7605 -j MASQUERADE
-A POSTROUTING -j ts-postrouting
```

### 6.2 Persistence
- Rules saved in `/etc/iptables/rules.v4`
- Restored on boot via `netfilter-persistent` service

### 6.3 Verification
```bash
# Check Docker exceptions
sudo iptables -L ts-forward -n -v | head -10

# Verify POSTROUTING order
sudo iptables -t nat -L POSTROUTING -n -v

# Test container connectivity
docker exec infra-new-bingebox-1 curl -I https://www.google.com
```

### 6.4 Emergency Fix
```bash
sudo iptables -I ts-forward 1 -s 172.16.0.0/12 -j ACCEPT
sudo iptables -I ts-forward 1 -d 172.16.0.0/12 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

### 6.5 Security Hardening

#### 6.5.1 fail2ban Configuration

**Status**: ✅ Installed (January 22, 2026)

**Jails**:
- `sshd`: 3 retries, 2-hour ban, monitoring `/var/log/auth.log`

**Commands**:
```bash
# Check status
sudo fail2ban-client status sshd

# View banned IPs
sudo fail2ban-client status sshd

# Unban an IP
sudo fail2ban-client set sshd unbanip <IP>

# View logs
sudo journalctl -u fail2ban -n 50 --no-pager
```

**Config**: `/etc/fail2ban/jail.local`

**Email notifications**: Sends ban notifications to `yancmo@gmail.com`

#### 6.5.2 iptables INPUT Policy

**Status**: ✅ Configured (January 22, 2026)

**Access Control**:
- **SSH (22)**: Tailscale network only (`100.64.0.0/10`)
- **HTTP/HTTPS (80/443)**: Public (Cloudflare/Traefik ingress)
- **SMB (139/445, 137/138)**: Local network only (`192.168.50.0/24`) for Kodi media streaming
- **Internal services** (8080-9117 range): Tailscale only
- **Default policy**: DROP

**Verification**:
```bash
sudo iptables -L INPUT -n -v --line-numbers
```

**Rules persisted**: `/etc/iptables/rules.v4` (restored via `netfilter-persistent` on boot)

**Emergency rollback** (console access required if SSH breaks):
```bash
sudo iptables -P INPUT ACCEPT
sudo iptables -F INPUT
sudo iptables-save > /etc/iptables/rules.v4
```

#### 6.5.3 SSH Hardening

**Config**: `/etc/ssh/sshd_config.d/99-hardening.conf`

**Settings**:
- `PermitRootLogin no`
- `PasswordAuthentication no`
- `PubkeyAuthentication yes`

**Access method**: Tailscale + key-based auth only

**Verification**:
```bash
sudo sshd -T | grep -E '(permitrootlogin|passwordauthentication|pubkeyauthentication)'
```

#### 6.5.4 Samba/SMB (Media Sharing for Kodi)

**Purpose**: Media streaming to Kodi (Firestick, local network devices)

**Security posture**:
- Bound to local network only (`192.168.50.0/24`)
- Ports 139/445 (TCP) and 137/138 (UDP) blocked from public internet
- Accessible only from LAN devices (TV, Firestick, etc.)
- **Not accessible** via Tailscale or public internet

**Media location**: `/mnt/media/` (Movies, TV, _incoming)

**Media drive**: WDC WD10JMVW-11AJGS4 (931.5GB external USB)
- Mounted at: `/dev/sdc2` → `/mnt/media` (ext4)
- **Power management disabled** (prevents streaming freezes)

**Services**:
- `smbd.service` - Samba daemon
- `nmbd.service` - NetBIOS name server

**Verification**:
```bash
# Check SMB is listening on local network
ss -tulpn | grep -E ':(139|445)'

# Check services are running
systemctl status smbd nmbd --no-pager

# Test from Kodi/Firestick:
# Add network location: smb://192.168.50.97/media/
```

**Disk Power Management**:

The external drive had aggressive power saving (APM level 128) causing it to spin down after ~10-20 minutes of inactivity, resulting in streaming freezes when Kodi tried to read data. This is now disabled.

```bash
# Check current power management status
sudo hdparm -B /dev/sdc
# Should show: APM_level = off

# Persistent udev rule (already configured)
# File: /etc/udev/rules.d/69-hdparm-sdc.rules
# Applied: 2026-01-25
```

To re-enable power saving (not recommended for media streaming):
```bash
sudo rm /etc/udev/rules.d/69-hdparm-sdc.rules
sudo udevadm control --reload-rules
sudo reboot
```

**SMB Streaming Optimizations**:

Applied comprehensive optimizations to prevent connection timeouts and improve streaming performance (2026-01-25):

**Configuration** (`/etc/samba/smb.conf` [global] section):
- **keepalive = 60**: SMB keepalive packets every 60 seconds
- **deadtime = 15**: Disconnect idle connections after 15 minutes
- **socket options**: TCP_NODELAY, IPTOS_LOWDELAY, 512KB send/receive buffers
- **oplocks = no**: Disabled opportunistic locking (prevents streaming issues)
- **min protocol = SMB2, max protocol = SMB3**: Modern protocol only
- **max xmit = 65535**: Larger transfer size for video files

**TCP Keepalive** (`/etc/sysctl.conf`):
- **tcp_keepalive_time = 300**: Send first keepalive after 5 minutes idle
- **tcp_keepalive_intvl = 30**: Send probes every 30 seconds
- **tcp_keepalive_probes = 5**: 5 failed probes = dead connection

Verification:
```bash
# Check SMB settings
sudo testparm -sv | grep -E 'keepalive|deadtime|socket options'

# Check TCP keepalive
sysctl net.ipv4.tcp_keepalive_time net.ipv4.tcp_keepalive_intvl net.ipv4.tcp_keepalive_probes

# Restart SMB if needed
sudo systemctl restart smbd nmbd
```

**Root Cause**: Session timeouts due to 2-hour TCP keepalive + no SMB keepalive, combined with small network buffers (208KB) and 9,740 dropped packets on the network interface caused by **RX ring buffer = 100 packets** (now fixed: increased to 4096).

**Network Interface Tuning** (2026-01-25):

The ethernet interface's **receive ring buffer** was severely undersized causing ~2+ packet drops per minute during streaming:
- **Before**: RX ring buffer = 100 packets (2.4% of hardware capability)
- **After**: RX ring buffer = 4096 packets (40x increase)
- **Result**: Packets can queue during traffic bursts without being dropped

Verification:
```bash
# Check current RX ring buffer
ethtool -g enx00e04c030111 | grep -A3 'Current hardware'
# Should show: RX: 4096

# Monitor for new drops
before=$(cat /sys/class/net/enx00e04c030111/statistics/rx_dropped)
sleep 60
after=$(cat /sys/class/net/enx00e04c030111/statistics/rx_dropped)
echo "New drops: $((after - before))"
```

Persistent via udev rule: `/etc/udev/rules.d/70-network-tune-enx00e04c030111.rules`

**Disable SMB** (if not needed):
```bash
sudo systemctl disable --now smbd nmbd
```

---

## 🚀 7. Deployment Patterns

### 7.1 Pattern 1: Add New Service to Stack

1. **Add service to docker-compose.yml**
2. **Assign networks** (edge for Traefik, backend for internal)
3. **Add Traefik labels** if external access needed
4. **Add environment variable** to `.env`
5. **Create data/log directories**
6. **Deploy**

```bash
cd /opt/infra-new/compose
docker compose -p infra-new up -d <service>
docker logs infra-new-<service>-1 --tail 50
```

### 7.2 Pattern 2: Migrate App from Git Repo

```bash
# 1. Clone repo
cd /opt/apps/apps
git clone https://github.com/yancmo1/<app>.git

# 2. Build image
cd <app>
docker build -t ghcr.io/shepswork/<app>:latest .

# 3. Add to docker-compose.yml (edit manually)

# 4. Create directories
mkdir -p /home/yancmo/apps/<app>/data
mkdir -p /opt/apps/logs/<app>

# 5. Deploy
cd /opt/infra-new/compose
docker compose -p infra-new up -d <app>
```

### 7.3 Pattern 3: Quick Update Workflow

```bash
# On server - pull and rebuild
cd /opt/apps/apps/<app>
git pull origin main
docker build -t ghcr.io/shepswork/<app>:latest .

cd /opt/infra-new/compose
docker compose -p infra-new restart <service>
```

---

## 🤖 8. Automation Services

### 8.1 GHCR Auto-Deploy

**Script**: `/opt/apps/scripts/ghcr-auto-deploy.sh`  
**Repo source**: `scripts/ghcr-auto-deploy.sh` (keep these in sync)  
**Log**: `/opt/apps/logs/ghcr-auto-deploy.log`  
**Status**: ✅ **ENABLED** (scheduled checks every 15 minutes + manual trigger)

#### Scheduled Checks (Automatic)
- **Timer Service**: `ghcr-auto-deploy.timer`
- **Check Service**: `ghcr-auto-deploy-check.service`
- **Schedule**: Every 15 minutes at :00, :15, :30, :45 (e.g., 12:00, 12:15, 12:30, 12:45...)
- **Resource Impact**: Negligible (~1-2 seconds CPU, <50 KB network per check)

Wiring note (important):
- Ensure the timer targets the **one-shot** check service (not the long-running watcher).
- Verify on server:
  - `systemctl show ghcr-auto-deploy.timer -p Unit` → `Unit=ghcr-auto-deploy-check.service`
  - `systemctl list-timers ghcr-auto-deploy.timer` should show `ACTIVATES` = `ghcr-auto-deploy-check.service`
  - `systemctl status ghcr-auto-deploy.service` should be **inactive/disabled** (legacy watcher)

#### Monitored Services
- `bingebox` → `ghcr.io/yancmo1/bingebox:latest`
- `coc-bot` → `ghcr.io/yancmo1/coc-discord-bot:latest`
- `clan-map` → `ghcr.io/yancmo1/clan-map:latest`
- `training-lms` → `ghcr.io/yancygcg/training-lms:dev`
- `crumb` → `ghcr.io/yancmo1/crumb-recipe-pwa:latest`
- `claimwatch-api` → `ghcr.io/yancmo1/claimwatch-pwa-api:latest`
- `claimwatch-web` → `ghcr.io/yancmo1/claimwatch-pwa-web:latest`
- `claimwatch-scheduler` → `ghcr.io/yancmo1/claimwatch-pwa-api:latest`
- `ghcr-dashboard` → `ghcr.io/shepswork/ubuntumac-server-ghcr-dashboard:latest` (this repo)
- `ops-dashboard` → `ghcr.io/shepswork/ubuntumac-server-ops-dashboard:latest` (this repo)

**Temporarily disabled from active monitoring:**
- `travel-frontend` (service not present in current `infra-new` compose)
- `travel-backend` (service not present in current `infra-new` compose)

**Monitor-only (no auto-deploy, just detect + log):**
- `watchsteps` → `nginx:alpine`
- `flaresolverr` → `ghcr.io/flaresolverr/flaresolverr:latest`

#### Common Commands
```bash
# View timer schedule (shows next 5 trigger times)
systemctl list-timers ghcr-auto-deploy.timer

# View detailed timer status
systemctl status ghcr-auto-deploy.timer --no-pager

# View recent check logs (systemd journal)
journalctl -u ghcr-auto-deploy-check.service -n 50 --no-pager

# View check logs (application log file)
tail -f /opt/apps/logs/ghcr-auto-deploy.log

# Manually trigger an immediate check (same effect as "Check Now" button)
sudo systemctl start ghcr-auto-deploy-check.service

# Check if a check is currently running
sudo systemctl is-active ghcr-auto-deploy-check.service

# Disable automatic checks (keeps "Check Now" button functional)
sudo systemctl disable --now ghcr-auto-deploy.timer

# Re-enable automatic checks
sudo systemctl enable --now ghcr-auto-deploy.timer
```

#### Behavior Notes
- Each automatic check is a **one-shot** execution (not a loop)
- Timeout protection: kills check if it runs >10 minutes (should complete in ~30 seconds)
- Randomized delay: up to 60 seconds jitter to avoid thundering herd
- Log file grows ~150 KB/day (96 checks × ~1.5 KB per check)
- Dashboard "Check Now" button continues to work alongside timer (uses same file lock)
- Self-healing: if a service container is **missing** (e.g., `docker rm`, `docker compose down`, or a failed recreate), the script will attempt to **recreate** it on the next run (emits `bootstrap_*` events).

#### 8.1.1 Self-Hosted GitHub Actions Runner (Organization-Wide)

**Status**: ❌ Disabled by choice (February 18, 2026)  
**Location**: `/home/yancmo/actions-runner`  
**Services disabled**:
- `actions.runner.ShepsWork.ubuntumac.service`
- `actions.runner.YancyGCG-training-lms.ubuntumac.service`

Decision: keep deploys on **scheduled timer checks + manual checks** and stop using self-hosted runner-triggered deploys for now.

**Current operating mode**:
- ✅ `ghcr-auto-deploy.timer` remains **enabled/active** (every 15 minutes)
- ✅ Manual one-shot checks remain available via `ghcr-auto-deploy-check.service`
- ✅ Dashboard **Check Now** remains available (same one-shot path)

**If re-enabling runners later** (rollback path):
```bash
sudo systemctl enable --now actions.runner.ShepsWork.ubuntumac.service
sudo systemctl enable --now actions.runner.YancyGCG-training-lms.ubuntumac.service
systemctl status actions.runner.ShepsWork.ubuntumac.service --no-pager
systemctl status actions.runner.YancyGCG-training-lms.ubuntumac.service --no-pager
```

**Verify runner status (expected now: disabled/inactive)**:
```bash
systemctl is-enabled actions.runner.ShepsWork.ubuntumac.service
systemctl is-active actions.runner.ShepsWork.ubuntumac.service
systemctl is-enabled actions.runner.YancyGCG-training-lms.ubuntumac.service
systemctl is-active actions.runner.YancyGCG-training-lms.ubuntumac.service
```

**Reconfigure runner (if needed)**:
```bash
cd /home/yancmo/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh uninstall
rm -f .runner .credentials .credentials_rsaparams

# Get token from: https://github.com/organizations/yancmo1/settings/actions/runners/new
./config.sh --url https://github.com/yancmo1 --token <ORG_TOKEN>

sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

**Template workflow for any app** (save as `.github/workflows/deploy.yml`):
```yaml
name: Build and Deploy
on:
  push:
    branches: [main, dev]
  workflow_dispatch:

jobs:
  build-and-push:
    runs-on: self-hosted
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
      - name: Deploy
        run: |
          ssh -i ~/.ssh/deploy_key claimwatch-deploy@192.168.50.97 \
            "sudo /opt/apps/scripts/ghcr-auto-deploy.sh"
```

**SSH deploy key setup** (one-time):
```bash
# As yancmo user (where runner runs)
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N '' -C "github-runner-deploy"
sudo bash -c "cat ~/.ssh/deploy_key.pub >> /home/claimwatch-deploy/.ssh/authorized_keys"
sudo chmod 600 /home/claimwatch-deploy/.ssh/authorized_keys
sudo chown claimwatch-deploy:claimwatch-deploy /home/claimwatch-deploy/.ssh/authorized_keys

# Test
ssh -i ~/.ssh/deploy_key claimwatch-deploy@192.168.50.97 "whoami"
```

**Monitoring**:
- GitHub: https://github.com/organizations/yancmo1/settings/actions/runners
- Logs: `/var/log/syslog` (filtered by `actions.runner`)
- Dashboard: https://ghcr.yancmo.xyz

**Documentation**: `docs/QUICK_START_SELF_HOSTED_RUNNER.md`

---

#### 8.1.2 Legacy: Push-Triggered SSH Deploy (Direct from GitHub Actions)

**Note**: This approach is superseded by the self-hosted runner (8.1.1). Kept for reference.

**Workflow**: `.github/workflows/claimwatch-deploy-lan.yml`

**Secrets required (GitHub Actions)**
- `DEPLOY_SSH_PRIVATE_KEY` — private key for the deploy user (raw key text).
- `DEPLOY_SSH_HOST` — hostname or IP (example: `ubuntumac` or `100.105.31.42`).
- `DEPLOY_SSH_USER` — deploy user (recommended: `claimwatch-deploy`).
- `DEPLOY_SSH_KNOWN_HOSTS` — output of `ssh-keyscan -H <host>`.

**Generate keypair (local or CI admin workstation)**
```bash
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/claimwatch_deploy -C "claimwatch-deploy@github-actions"
cat ~/.ssh/claimwatch_deploy.pub
```

**Capture known_hosts (local)**
```bash
ssh-keyscan -H ubuntumac
# OR:
ssh-keyscan -H 100.105.31.42
```

**Server setup (least-privilege deploy user)**
```bash
sudo adduser --disabled-password --gecos "" claimwatch-deploy
sudo usermod -aG sudo claimwatch-deploy

sudo mkdir -p /home/claimwatch-deploy/.ssh
sudo tee /home/claimwatch-deploy/.ssh/authorized_keys >/dev/null <<'EOF'
<PASTE_PUBLIC_KEY_HERE>
EOF
sudo chown -R claimwatch-deploy:claimwatch-deploy /home/claimwatch-deploy/.ssh
sudo chmod 700 /home/claimwatch-deploy/.ssh
sudo chmod 600 /home/claimwatch-deploy/.ssh/authorized_keys

sudo tee /etc/sudoers.d/claimwatch-deploy-ghcr >/dev/null <<'EOF'
claimwatch-deploy ALL=(root) NOPASSWD: /opt/apps/scripts/ghcr-auto-deploy.sh
EOF
sudo chmod 440 /etc/sudoers.d/claimwatch-deploy-ghcr
```

**Validation**
```bash
# Verify SSH access (from admin machine)
ssh -i ~/.ssh/claimwatch_deploy claimwatch-deploy@ubuntumac "sudo /opt/apps/scripts/ghcr-auto-deploy.sh"

# Confirm timer fallback still active (on server)
systemctl status ghcr-auto-deploy.timer --no-pager
systemctl list-timers ghcr-auto-deploy.timer
```

**Rollback**
```bash
# Disable GitHub Actions deploy by removing secrets or workflow

# Remove sudo privilege
sudo rm /etc/sudoers.d/claimwatch-deploy-ghcr

# Remove key + user (optional)
sudo rm -rf /home/claimwatch-deploy/.ssh
sudo deluser --remove-home claimwatch-deploy
```

**Notes**
- Keep host key checking enabled (use `DEPLOY_SSH_KNOWN_HOSTS`).
- The **systemd timer remains enabled** as a fallback until push deploy is verified.

##### Logging format (important for dashboard UI)

The dashboard can parse both:

1) **Human-readable** lines like:
  - `🔍 Checking <app>...`
  - `📦 New image detected for <app>!`

2) **Structured JSON lines** (recommended) so the UI can reliably show per-app version/commit:

```json
{"ts":"2026-01-13T23:12:34+00:00","app":"bingebox","level":"info","event_type":"update_complete","message":"Deployed successfully","image":"ghcr.io/shepswork/bingebox:latest","old_image":"ghcr.io/shepswork/bingebox:rev-aaaaaaa","new_image":"ghcr.io/shepswork/bingebox:v1.2.3-bbbbbbb"}
```

The dashboard prefers `new_image`/`image` for the Apps list; the text after `:` is treated as the version/commit tag.

### 8.2 PM2 Process Manager

**Service**: `pm2-yancmo.service`  
**Status**: ✅ Running

Active processes:
- `assistant-bridge` (Node.js, port 3000)

```bash
pm2 list
pm2 logs assistant-bridge
```

### 8.3 GHCR Deploy Dashboard (Web UI)

**Purpose**: A small web dashboard to monitor GHCR auto-deploy activity and keep a searchable **event history**.

This is intentionally lightweight:
- It can **tail** the existing log file (`/opt/apps/logs/ghcr-auto-deploy.log`) and parse events best-effort.
- Optionally, `ghcr-auto-deploy.sh` (or any script) can **POST structured events** to the dashboard API for higher fidelity.
- The UI **auto-refreshes** periodically; an SSE endpoint exists for advanced/DIY live streaming.

**Service**: `ghcr-dashboard` (Docker container in `infra-new` stack)

**Repo code** (workspace): `ubuntumac-server/ghcr-dashboard/`

**Data** (server): `/home/yancmo/apps/ghcr-dashboard/` (SQLite DB)

**Log source** (server): `/opt/apps/logs/ghcr-auto-deploy.log` (mounted read-only)

**Internal Port**: `8000` (served behind Traefik)

**Recommended Hostname**: `ghcr.yancmo.xyz`

#### Routing Options

**Option A (recommended)**: Cloudflare Tunnel → Traefik (Pattern A)
```
Cloudflare → Tunnel → https://localhost:443 → Traefik → ghcr-dashboard:8000
```
- Add `ghcr.yancmo.xyz` in Cloudflare Zero Trust Tunnel as:
  - Service: `https://localhost:443`
  - TLS: **No TLS Verify** ✅

**Option B (Tailscale-only)**: No public hostname
- Access via Tailscale + Traefik only (private) or bind a host port to the Tailscale IP.
- Recommended when you do not want the dashboard reachable from the public internet.

#### Required/Optional Environment Variables

Add to `/opt/infra-new/compose/.env`:
```bash
GHCR_DASHBOARD_HOST=ghcr.yancmo.xyz

# Optional but recommended:
# If set, required for POST /api/events
GHCR_DASHBOARD_TOKEN=<set-a-long-random-token>

# Optional: show version + git commit in the Apps panel UI
GHCR_DASHBOARD_VERSION=1.1
GHCR_DASHBOARD_BUILD_SHA=abcdefg
```

Container env (in compose):
- `DATABASE_PATH=/data/events.sqlite3`
- `LOG_FILE_PATH=/logs/ghcr-auto-deploy.log`
- `LOG_POLL_SECONDS=5`
- Optional display metadata:
  - `APP_VERSION=${GHCR_DASHBOARD_VERSION}`
  - `APP_BUILD_SHA=${GHCR_DASHBOARD_BUILD_SHA}`

**Recommended (accurate commit every deploy):** deploy the dashboard via **GHCR image** so build metadata is baked into the image.

- The dashboard reads `APP_BUILD_SHA`/`APP_VERSION` and exposes them via `GET /api/summary`.
- If you set these as *container environment variables* in `.env`, they can go stale.
- Prefer **Docker build args** (and/or use the helper script below) so the SHA always matches the image you built.

GHCR image (recommended):
- `ghcr.io/shepswork/ubuntumac-server-ghcr-dashboard:latest`

With this setup:
- GitHub Actions builds and pushes the image on every commit to `main`.
- The server auto-deploy timer (`ghcr-auto-deploy.timer`) pulls/recreates `ghcr-dashboard` just like other services.

GitHub repo requirements:
- Ensure **GitHub Actions is enabled** for the repo.
- Recommended: Repo **Settings → Actions → General → Workflow permissions** → set **Read and write permissions** for `GITHUB_TOKEN`.
- If package permissions are finicky (common when moving repos), set a secret:
  - `GHCR_PAT` = a classic PAT with **`write:packages`** (and typically `read:packages`).
  - The workflow will use `GHCR_PAT` if present, otherwise it falls back to `GITHUB_TOKEN`.

Legacy/manual (still available):
- `/opt/apps/apps/ubuntumac-server/ghcr-dashboard/rebuild-on-server.sh` rebuilds locally from the repo.

#### Verify

From anywhere that can reach Traefik for that hostname:
- Health: `https://ghcr.yancmo.xyz/api/health` → `{ "status": "ok" ... }`
- UI: `https://ghcr.yancmo.xyz/`

If `https://ghcr.yancmo.xyz/api/health` returns **HTTP 404**, Traefik likely has no active router for that host (often because the `ghcr-dashboard` container is not running / was removed).
On-server quick check:
```bash
cd /opt/infra-new/compose
docker compose -p infra-new ps ghcr-dashboard
```
Quick recovery:
```bash
cd /opt/infra-new/compose
sudo docker pull ghcr.io/shepswork/ubuntumac-server-ghcr-dashboard:latest
sudo docker compose -p infra-new up -d --force-recreate ghcr-dashboard
```

If `https://ghcr.yancmo.xyz/...` returns **HTTP 502** from Cloudflare, it usually means Cloudflare Tunnel cannot connect to the origin due to TLS verification/SNI mismatch (common when the origin is `https://localhost:443` but Traefik presents a `*.yancmo.xyz` certificate).

Fix in Cloudflare One (Tunnel → Published application routes → `ghcr.yancmo.xyz`):
- Either set **No TLS Verify** = ✅ true, **or**
- Prefer: set **Match SNI to Host** = ✅ true (so SNI becomes `ghcr.yancmo.xyz`).

On-server validation:
```bash
cd /opt/infra-new/compose
docker compose -p infra-new ps ghcr-dashboard
docker logs infra-new-ghcr-dashboard-1 --tail 100
```

#### Suggested Event Types (API)

When posting to `POST /api/events`, use a small taxonomy:
- `check_start`, `check_complete`
- `update_start`, `pull_start`, `pull_complete`, `restart_start`, `restart_complete`
- `update_skipped` (no update), `update_failed`

#### Live Streaming (SSE)

The dashboard exposes an SSE endpoint for “tail -f, but in the browser”:
- `GET /api/events/stream?after_id=<id>`

UI note: the dashboard includes a **Live Console** panel with **Connect / Disconnect / Clear** controls backed by SSE (`/api/console/stream`).

#### Manual Trigger (Check Now Button)

The dashboard provides a **"Check Now"** button in the header to manually trigger a GHCR check:
- Endpoint: `POST /api/check-now` (not bearer-token protected)
- Effect: Runs `/opt/apps/scripts/ghcr-auto-deploy.sh` in the background
- Logging: Records a `check_manual` event in the dashboard
- Use case: On-demand checking without automatic 5-minute polling

Expected behavior:
- If you click multiple times while a run is in progress, the API may respond **HTTP 409** (Conflict). This is normal (lock held); the UI should briefly show **"Already running"**.

Operator confidence checks:
- Status: `https://ghcr.yancmo.xyz/api/check-now/status` → shows whether a check is currently running (lock held) and the last trigger timestamps.

Security note:
- Because `/api/check-now` triggers an action on the server, access to the dashboard **must** be controlled at the edge (e.g., Cloudflare Access/Zero Trust, Tailscale-only access, or another auth layer in front of Traefik). The bearer token (`GHCR_DASHBOARD_TOKEN`) is reserved for **event ingestion** (`POST /api/events`), not the UI button.

Runtime requirements (for deployments to actually work):
- The dashboard triggers deployments by running `/opt/apps/scripts/ghcr-auto-deploy.sh` **from inside the `ghcr-dashboard` container**, using the host Docker socket.
- Required mounts for the `ghcr-dashboard` service:
  - `/opt/apps/scripts:/opt/apps/scripts:ro` (script)
  - `/opt/infra-new/compose:/opt/infra-new/compose:ro` (compose project)
  - `/var/run/docker.sock:/var/run/docker.sock` (control host Docker)
  - `/home/yancmo/.docker:/root/.docker:ro` (Docker registry auth for private GHCR images)
  - `/home/yancmo/apps:/home/yancmo/apps:ro` and `/opt/apps/apps:/opt/apps/apps:ro` so `docker compose` can resolve any `env_file:` paths referenced by `/opt/infra-new/compose/docker-compose.yml`.

If you see `Failed to pull <service>` plus messages like `env file ... not found`, it usually means the container cannot see one of those `env_file` paths; add the mounts above and restart `ghcr-dashboard`.

Scheduling note:
- Automatic checks are handled by **systemd** (`ghcr-auto-deploy.timer` → `ghcr-auto-deploy-check.service`).
- The dashboard's **Check Now** button is an on-demand trigger; it does not replace the timer.

Troubleshooting (Check Now):
- If the button shows "Error", check the browser console and server logs: `docker logs infra-new-ghcr-dashboard-1 --tail 50`
- If you are seeing `401 Missing Bearer token`, the server is running an older dashboard build; rebuild/restart the `ghcr-dashboard` container.
- Verify the dashboard token is set in `.env` **only if you use ingestion** (`POST /api/events`): `grep GHCR_DASHBOARD_TOKEN /opt/infra-new/compose/.env`

If Check Now ran but you only see `check_manual` events:
- Older builds only recorded the `check_manual` marker and relied on tailing `/opt/apps/logs/ghcr-auto-deploy.log` for detailed lines.
- Current builds also parse the script output and store it directly as events (source `check-now`), so you should see lines like `New image detected` / `Deploying` in Recent events.

Quick API verification (should print lines like `🔍 Checking <app>...`):
```bash
curl -fsSL 'https://ghcr.yancmo.xyz/api/events?limit=200' | \
  python3 - <<'PY'
import json,sys
d=json.load(sys.stdin)
shown=0
for e in d.get('events',[]):
    if e.get('source')=='check-now':
        print(e.get('ts'), e.get('app'), e.get('event_type'), (e.get('message') or '')[:160])
        shown += 1
        if shown >= 25:
            break
print('shown', shown)
PY
```

Cosmetic:
- Some browsers request `/favicon.ico` by default. The dashboard responds **204 No Content** to avoid noisy console 404s.

UI filters:
- The Recent Events panel includes an **App** dropdown to filter the event list.
- For SSE consumers, the stream endpoint also supports `?app=<name>`.

Apps panel filtering (cosmetic):
- The **Apps** panel intentionally shows only apps whose latest image ref starts with `ghcr.io/` and have a non-empty image.
- Housekeeping entries like `ghcr-auto-deploy` and services running non-GHCR images (example: `watchsteps` using `nginx:alpine`) are still tracked in events, but hidden from the Apps grid to keep it clean.

UI status indicators:
- The **Apps** panel shows a **Last update** timestamp (latest event seen) and an optional **build** SHA (if provided via dashboard env).

#### Rollback

Disable the dashboard without affecting app deployments:
```bash
cd /opt/infra-new/compose
docker compose -p infra-new stop ghcr-dashboard
```

---

## ☁️ 9. Cloudflare Tunnel

**Container**: `infra-new-cloudflared-1`  
**Network Mode**: host  
**Status**: Working (healthcheck shows unhealthy due to ICMP permissions, but tunnel works)

### Tunnel Ingress Rules
| Hostname | Service |
|----------|---------|
| `binge.yancmo.xyz` | `http://localhost:8081` |
| `watchsteps.shepswork.com` | `https://localhost:443` |
| `yancmo.xyz` | `https://localhost:443` |
| `dev-lms.yancmo.xyz` | `https://localhost:443` |
| `stridelog-weather.yancmo.xyz` | `https://localhost:443` |
| `travel.yancmo.xyz` | `https://localhost:443` |
| `assistant.yancmo.xyz` | `http://localhost:3000` |
| `clashmap.yancmo.xyz` | `http://localhost:5552` |
| Default | `http_status:404` |

### Notes: WatchSteps domain move

WatchSteps has moved off the `*.yancmo.xyz` namespace:
- Old: `watchsteps.yancmo.xyz` (retired)
- New: `watchsteps.shepswork.com`

If WatchSteps is still hosted here (Traefik + nginx), ensure the server `.env` reflects the new hostname:
```bash
# /opt/infra-new/compose/.env
WATCHSTEPS_HOST=watchsteps.shepswork.com
```

And update the Cloudflare Tunnel Published application route to match the new hostname.

### yancmo.xyz (parked landing page)

There is a simple placeholder landing page for `yancmo.xyz` in this repo:
- File: `yancmo-landing/index.html`
- Behavior: the main quote randomizes on each page refresh (client-side JS).

DNS prerequisite:
- `yancmo.xyz` must have a DNS record in Cloudflare (usually proxied).
- Quick check (public resolver):
  ```bash
  dig @1.1.1.1 +short yancmo.xyz A
  ```
  If this returns **no lines** (often only an SOA in the authority section), the apex record is missing and clients will fail with “Could not resolve host”.
  Adding a Cloudflare Tunnel **Public Hostname / Published application route** for `yancmo.xyz` typically creates/updates the needed DNS record automatically.

To serve it via Traefik on this host (recommended):
1) Add a static nginx service (example):
```yaml
  yancmo-root:
    image: nginx:alpine
    container_name: infra-new-yancmo-root-1
    restart: unless-stopped
    volumes:
      - /home/yancmo/apps/www/yancmo.xyz:/usr/share/nginx/html:ro
    networks:
      - edge
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=edge"
      - "traefik.http.routers.yancmo-root.rule=Host(`${YANCMO_ROOT_HOST}`)"
      - "traefik.http.routers.yancmo-root.entrypoints=websecure"
      - "traefik.http.routers.yancmo-root.tls=true"
      - "traefik.http.services.yancmo-root.loadbalancer.server.port=80"
```
2) Set:
```bash
# /opt/infra-new/compose/.env
YANCMO_ROOT_HOST=yancmo.xyz
```
3) Copy `yancmo-landing/index.html` to the server at `/home/yancmo/apps/www/yancmo.xyz/index.html`.
   - Helper script (local workspace): `ops/server_deploy_yancmo_landing.sh`
4) Cloudflare Tunnel: add a Published application route for `yancmo.xyz` → `https://localhost:443`.
5) Verify:
```bash
dig @1.1.1.1 +short yancmo.xyz A
curl -Ik https://yancmo.xyz
```

### Credentials
- Stored in `/home/yancmo/.cloudflared/`
- Token in `/opt/infra-new/compose/.env`

### Important: Where routes are managed

The tunnel is currently **remotely managed** (Cloudflare One “Published application routes”). The running `cloudflared` connector logs an **"Updated to new configuration"** message when Cloudflare pushes changes.

In practice:
- Treat Cloudflare One (dashboard/API) as the **source of truth** for hostname → origin mappings.
- The local file `/home/yancmo/.cloudflared/config.yml` is still mounted into the container and used for tunnel identity/credentials, but its `ingress:` rules may not reflect what is currently active if remote management is enabled.

---

## 💾 10. Backup System

### 10.1 Current State

| Component | Status | Last Verified |
|-----------|--------|---------------|
| **pCloud Backup** | ✅ **Running** | **Feb 2, 2026** |
| **Backup Verification** | ✅ **Automated** | **Feb 2, 2026** |
| **rclone** | ✅ v1.72.0 | Configured |
| **Local Backup** | ✅ 2 AM daily | Legacy script |
| **pCloud Sync** | ✅ 3 AM daily | 479.9 MiB |
| **Email Notifications** | ✅ msmtp | Gmail SMTP |
| **Database Backups** | ✅ **ALL WORKING** | **4/4 databases** |

### 10.2 pCloud Backup (Primary)

**Script**: `/opt/apps/scripts/pcloud-backup.sh`  
**Cron**: `0 3 * * *` (daily at 3 AM)  
**Log**: `/opt/apps/logs/pcloud-backup.log`  
**Remote**: `pcloud:ServerBackups/ubuntumac/`  
**Email**: Sends report to `yancmo@gmail.com` after each backup  
**Local Staging**: `/opt/backups/`

**What's backed up:**
```
pcloud:ServerBackups/ubuntumac/
├── db/                    # PostgreSQL dumps (7-day retention, 4 databases)
│   ├── cocstack_YYYY-MM-DD_HH-MM-SS.sql.gz        # COC Discord Bot
│   ├── claimwatch_YYYY-MM-DD_HH-MM-SS.sql.gz      # ClaimWatch PWA
│   ├── crumb_YYYY-MM-DD_HH-MM-SS.sql.gz           # Crumb Recipe  
│   └── traininglms_YYYY-MM-DD_HH-MM-SS.sql.gz     # Training LMS
├── configs/               # All configuration files
│   ├── docker-compose.yml
│   ├── compose.env
│   ├── traefik/
│   ├── cloudflared/
│   ├── rclone.conf
│   ├── msmtprc
│   └── *.service files
├── env-files/             # All .env files from all apps
│   ├── bingebox.env
│   ├── coc-discord-bot.env
│   ├── assistant-365-bridge.env
│   ├── pihole.env
│   └── compose.env
├── app-repos/             # Application source code
│   ├── bingebox/          # 25M (excludes node_modules, .git)
│   ├── coc-discord-bot/   # 9.8M
│   ├── watchsteps-website/# 48K
│   └── assistant-365-bridge/ # 212K
├── app-data/              # Application runtime data
│   ├── bingebox-home/
│   ├── bingebox-opt/
│   ├── coc-discord-bot-home/
│   ├── coc-discord-bot-opt/
│   ├── assistant-365-bridge/
│   ├── jackett/
│   └── pihole/
└── scripts/               # Automation & logs
    ├── opt-apps-scripts/
    ├── crontab-yancmo.txt
    ├── crontab-root.txt
    └── app-logs/
```

**Commands:**
```bash
# Run backup manually (IMPORTANT: run as user `yancmo`)
# If you run this script via sudo/root, rclone may look for /root/.config/rclone/rclone.conf
# and fail to find the `pcloud:` remote.
/opt/apps/scripts/pcloud-backup.sh

# If you are already root, run it as yancmo:
sudo -u yancmo -H /opt/apps/scripts/pcloud-backup.sh

# Check pCloud contents
rclone tree pcloud:ServerBackups/ubuntumac --level 2

# Check backup size
rclone size pcloud:ServerBackups/ubuntumac

# View backup log
tail -50 /opt/apps/logs/pcloud-backup.log

# List all remotes
rclone listremotes
```

Notes:
- It is normal to see rclone NOTICE lines about symlinks (e.g. "Can't follow symlink without -L/--copy-links"). These do not indicate a failed backup.

### 10.3 Local Backup (Secondary)

**Script**: `/home/yancmo/backup-apps.sh`  
**Cron**: `0 2 * * *` (daily at 2 AM)  
**Destination**: `/mnt/apps-backup/`  
**Retention**: 30 days

### 10.4 rclone Configuration

**Config file**: `~/.config/rclone/rclone.conf`  
**Remote name**: `pcloud`  
**Region**: US (api.pcloud.com)

### 10.5 Email Notifications (msmtp)

**Config file**: `~/.msmtprc`  
**Mail client**: msmtp v1.8.24  
**SMTP**: Gmail (smtp.gmail.com:587)  
**Recipient**: yancmo@gmail.com

**Test email:**
```bash
echo "Test message" | msmtp yancmo@gmail.com
```

**Email log**: `~/.msmtp.log`

### 10.6 Storage

| Mount | Size | Used | Available |
|-------|------|------|-----------|
| `/mnt/media` | 522GB | 52GB | 444GB |
| `/mnt/apps-backup` | 394GB | 1.5MB | 374GB |
| `/opt/backups` | - | 42MB | Local staging |
| **pCloud** | - | **53.9 MiB** | Cloud backup |

**Backup Sizes by Category:**
| Category | Size |
|----------|------|
| bingebox repo | 25M |
| coc-discord-bot repo | 9.8M |
| watchsteps-website | 48K |
| assistant-365-bridge | 212K |
| PostgreSQL | 8K |
| Configs & .env | ~100K |

### 10.7 Maintenance Schedule

**Status**: ✅ Configured (January 22, 2026)

#### Automated Tasks

| **Backup Verification** | **Daily 0400 CST** | `/opt/apps/scripts/verify-backups.sh` | `/opt/apps/logs/backup-verification.log` |
| Task | Schedule | Command | Log |
|------|----------|---------|-----|
| pCloud Backup | Daily 0300 CST | `/opt/apps/scripts/pcloud-backup.sh` | `/opt/apps/logs/pcloud-backup.log` |
| Local Backup | Daily 0200 CST | `/home/yancmo/backup-apps.sh` | `/var/log/apps-backup.log` |
| GHCR Auto-Deploy | Every 15 minutes | `ghcr-auto-deploy.timer` | `/opt/apps/logs/ghcr-auto-deploy.log` |
| Disk Usage Report | Weekly Sun 0700 CST | `df -h` via email | Email |

#### Manual Maintenance (Monthly)

**Docker Image Cleanup** (30-day retention):
```bash
docker image prune -a --filter "until=720h" -f
```

**Review fail2ban logs**:
```bash
sudo fail2ban-client status sshd
sudo journalctl -u fail2ban --since "7 days ago" | grep Ban
```

**Check for OS updates**:
```bash
sudo apt update && sudo apt list --upgradable
```

**Verify backups**:
```bash
tail -50 /opt/apps/logs/backup-verification.log
rclone size pcloud:ServerBackups/ubuntumac

# Run manual verification
/opt/apps/scripts/verify-backups.sh

# Test restore procedure for a database
/opt/apps/scripts/test-restore.sh cocstack
```

### 10.7.1 Backup Verification System

**Added**: February 2, 2026

#### Automated Verification (Daily 4 AM)

The backup verification script (`/opt/apps/scripts/verify-backups.sh`) runs 1 hour after backups complete and:

1. **Checks each database backup**:
   - COCStack (min 2KB)
   - ClaimWatch (min 50KB)
   - Crumb (min 50KB)  
   - Training LMS (min 50KB)

2. **Validates file integrity**:
   - File size exceeds minimum threshold
   - Gzip compression is valid
   - File can be decompressed

3. **Verifies pCloud sync**:
   - Connection to pCloud successful
   - Database directory synced

4. **Sends email alerts** if ANY backup fails

**View verification logs:**
```bash
tail -100 /opt/apps/logs/backup-verification.log
```

#### Manual Restore Testing

**Script**: `/opt/apps/scripts/test-restore.sh`

**Usage:**
```bash
# Test any database backup
/opt/apps/scripts/test-restore.sh <database-name>

# Examples
/opt/apps/scripts/test-restore.sh cocstack
/opt/apps/scripts/test-restore.sh claimwatch
/opt/apps/scripts/test-restore.sh crumb
/opt/apps/scripts/test-restore.sh traininglms
```

**What it tests:**
- Gzip integrity
- SQL dump header validation
- Table/data statement counts
- Provides exact restore commands (dry-run)

#### Database Backup Issue History

**Fixed February 2, 2026:**  
Prior to Feb 2, 2026, **3 out of 4 databases were failing silently**:

| Database | Issue | Fix |
|----------|-------|-----|
| ClaimWatch | Wrong container + user (`postgres`) | Fixed: `infra-new-claimwatch-db-1 -U claimwatch` |
| Crumb | Wrong user + database name | Fixed: `-U crumb crumb` |
| Training LMS | Wrong user + database name | Fixed: `-U lmsapp lms` |
| Travel | Container not deployed | Disabled in script |

**Root Cause**: Database credentials in backup script were outdated/incorrect. User reported "lost COC database 6th time" which triggered comprehensive audit revealing ClaimWatch database actually had the backup failures (6+ months of empty 20-byte backups).

**Prevention**: 
- Daily verification script now catches silent failures
- Email alerts on backup validation failure
- File size checks (< 100 bytes = alert)one size pcloud:ServerBackups/ubuntumac
```

#### Maintenance Window

**Preferred time**: 0300 CST (low traffic, safe for brief restarts)

**Typical operations**:
- Kernel updates (reboot required)
- Docker daemon updates
- Service configuration changes requiring restart
- Image cleanup (no downtime)

**Disk Management**:
- Monthly cleanup of Docker images (30-day retention) keeps usage below 80%
- Alert threshold: 80% disk usage on root filesystem

### 10.8 Restore Procedures

**Database Credentials (REFERENCE):**

| Database | Container | User | Database Name |
|----------|-----------|------|---------------|
| COCStack | `infra-new-cocstack-db-1` | `cocuser` | `cocstack` |
| ClaimWatch | `infra-new-claimwatch-db-1` | `claimwatch` | `claimwatch` |
| Crumb | `infra-new-crumb-postgres-1` | `crumb` | `crumb` |
| Training LMS | `infra-new-lms-postgres-1` | `lmsapp` | `lms` |

**Restore PostgreSQL (COCStack example):**
```bash
# Download latest backup
rclone copy pcloud:ServerBackups/ubuntumac/db/ /tmp/db-restore/

# Find latest dump
ls -lt /tmp/db-restore/cocstack_*.sql.gz | head -5

# Restore to container (OVERWRITES current database!)
gunzip -c /tmp/db-restore/cocstack_YYYY-MM-DD_HH-MM-SS.sql.gz | \
  docker exec -i infra-new-cocstack-db-1 psql -U cocuser cocstack
```

**Restore ClaimWatch:**
```bash
gunzip -c /tmp/db-restore/claimwatch_YYYY-MM-DD_HH-MM-SS.sql.gz | \
  docker exec -i infra-new-claimwatch-db-1 psql -U claimwatch claimwatch
```

**Restore Crumb:**
```bash
gunzip -c /tmp/db-restore/crumb_YYYY-MM-DD_HH-MM-SS.sql.gz | \
  docker exec -i infra-new-crumb-postgres-1 psql -U crumb crumb
```

**Restore Training LMS:**
```bash
gunzip -c /tmp/db-restore/traininglms_YYYY-MM-DD_HH-MM-SS.sql.gz | \
  docker exec -i infra-new-lms-postgres-1 psql -U lmsapp lms
```

**Safe Restore (Test Database First):**
```bash
# Create test database
docker exec infra-new-cocstack-db-1 psql -U cocuser -c 'DROP DATABASE IF EXISTS cocstack_test;'
docker exec infra-new-cocstack-db-1 psql -U cocuser -c 'CREATE DATABASE cocstack_test;'

# Restore to test database
gunzip -c /tmp/db-restore/cocstack_YYYY-MM-DD.sql.gz | \
  docker exec -i infra-new-cocstack-db-1 psql -U cocuser -d cocstack_test

# Verify tables exist
docker exec infra-new-cocstack-db-1 psql -U cocuser -d cocstack_test -c '\dt'

# If successful, drop live database and rename test (DANGEROUS!)
docker exec infra-new-cocstack-db-1 psql -U cocuser -c 'DROP DATABASE cocstack;'
docker exec infra-new-cocstack-db-1 psql -U cocuser -c 'ALTER DATABASE cocstack_test RENAME TO cocstack;'
```

**Restore Configs:**
```bash
# Download all configs
rclone copy pcloud:ServerBackups/ubuntumac/configs/ /tmp/config-restore/

# Review and copy back
cp /tmp/config-restore/docker-compose.yml /opt/infra-new/compose/
```

**Restore App Data:**
```bash
rclone copy pcloud:ServerBackups/ubuntumac/app-data/bingebox/ /home/yancmo/apps/bingebox/data/
```

---

## 🐛 11. Troubleshooting

### Issue: Container Can't Reach Internet

```bash
# Diagnosis
docker exec <container> curl -I https://www.google.com

# Fix
sudo iptables -I ts-forward 1 -s 172.16.0.0/12 -j ACCEPT
sudo iptables -I ts-forward 1 -d 172.16.0.0/12 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

### Issue: Traefik Not Routing

```bash
# Check logs
docker logs infra-new-traefik-1 --tail 100

# Verify network
docker inspect <container> | grep -A 5 Networks

# Must have
networks:
  - edge
```

### Issue: Container Port in Use

```bash
sudo lsof -i :<port>
sudo kill <pid>
# Or restart Docker
sudo systemctl restart docker
```

### Issue: Cloudflared "Unhealthy"

This is expected - the healthcheck uses `pgrep` which returns unhealthy due to ICMP permissions. Check actual tunnel status:

```bash
docker logs infra-new-cloudflared-1 --tail 20
# Look for "Registered tunnel connection"
```

---

## 📊 12. Health Check URLs

| Service | URL | Expected |
|---------|-----|----------|
| **Traefik Dashboard** | `http://100.105.31.42:8080` | Dashboard UI |
| **Training LMS** | `https://dev-lms.yancmo.xyz/api/health` | 200 OK |
| **BingeBox** | `https://binge.yancmo.xyz/api/health` | 200 OK |
| **Jackett** | `http://100.105.31.42:9117/UI/Dashboard` | Dashboard UI |
| **FlareSolverr** | `http://100.105.31.42:8191/health` | 200 OK |
| **WatchSteps** | `https://watchsteps.shepswork.com` | HTML page |
| **yancmo.xyz** | `https://yancmo.xyz` | 200 OK (placeholder HTML) once DNS + Tunnel route are configured |
| **Ops Dashboard** | `https://dashboard.yancmo.xyz` | 200 OK |
| **GHCR Deploy Dashboard** | `https://ghcr.yancmo.xyz/api/health` | 200 OK (`status: ok`) |
| **Pi-hole Admin (Tailscale only)** | `http://100.105.31.42:8082/admin` | Admin UI loads |
| **Travel Journal** | `https://travel.yancmo.xyz/api/health` | 200 OK |
| **Travel Journal UI** | `https://travel.yancmo.xyz` | 200 OK (React app loads) |

---

## 📚 13. Quick Reference

### Essential Commands
```bash
# SSH
ssh yancmo@100.105.31.42

# Stack status
cd /opt/infra-new/compose && docker compose -p infra-new ps

# Logs
docker logs infra-new-<service>-1 -f

# Restart
docker compose -p infra-new restart <service>

# Full redeploy
docker compose -p infra-new up -d --force-recreate <service>

# Check connectivity
docker exec <container> curl -I https://www.google.com

# iptables
sudo iptables -L -n -v
sudo iptables -t nat -L -n -v

# Tailscale
tailscale status
```

### Environment Variables (.env)
```bash
BINGEBOX_HOST=binge.yancmo.xyz
WATCHSTEPS_HOST=watchsteps.shepswork.com
YANCMO_ROOT_HOST=yancmo.xyz
SSL_EMAIL=admin@yancmo.xyz
```

---

## ⚠️ 14. Known Issues & Recommendations

### 🔴 Critical Issues

1. ~~**Backup not running to pCloud**~~ ✅ **FIXED** (Nov 28, 2025)
   - pCloud backup configured and tested
   - Daily cron at 3 AM
   - **All app repos backed up**: bingebox, coc-discord-bot, watchsteps-website, assistant-365-bridge
   - PostgreSQL, configs, .env files, and app data all backed up
   - Email notifications via msmtp/Gmail
   - Total backup size: 39.4 MiB

2. **Cloudflared healthcheck always fails** (cosmetic)
   - ICMP permissions issue
   - Tunnel actually works fine - no action needed

### 🟡 Improvements Recommended

1. **Migrate legacy services to Traefik pattern** (Priority)
   - Move `binge.yancmo.xyz`, `assistant.yancmo.xyz`, and `clashmap.yancmo.xyz` from direct port routing to `https://localhost:443` + noTLSVerify
   - Benefits: Centralized routing, consistent TLS, health checks, easier management
   - See Section 15.3 for migration steps
2. **Orphaned Docker volume**: `coc-discord-bot_cocstack_postgres_data` (0B, unused)
3. **Stale iptables rules**: References to deleted networks (172.20.x, 172.21.x, 172.22.x)
4. **Directory inconsistency**: App data split between `/opt/apps/` and `/home/yancmo/apps/`
5. **PM2 app not in docker-compose**: `assistant-bridge` runs outside Docker stack
6. **Docker image cleanup**: 4.2GB reclaimable in unused images

### 🟢 Nice to Have

1. **Consolidate logs**: Centralize all logs to `/opt/apps/logs/`
2. **Docker image cleanup**: 4.2GB reclaimable in unused images
3. **Document Cloudflare tunnel config**: Currently managed via Cloudflare dashboard

---

## ✔️ Verification Checklist

After any infrastructure change:

- [ ] Update this Master Guide
- [ ] Verify docker-compose loads: `docker compose -p infra-new config`
- [ ] Restart Traefik if routing modified
- [ ] Validate iptables: `docker exec <container> curl https://google.com`
- [ ] Confirm Tailscale: `tailscale status`
- [ ] Run app health checks
- [ ] If Pi-hole changed: validate DNS from a Tailscale device (A record + ad-block test)
- [ ] Test backup script manually
- [ ] Commit changes and push

---

**Version**: 2.11  
**Last Updated**: February 3, 2026  
**Last Audit**: January 22, 2026  
**Last Backup**: January 22, 2026 (71.6 MiB to pCloud)  
**Security Hardening**: January 22, 2026

---

## 📎 Appendix: Sharing This Guide With Other Apps

### Symlink to App Repositories

This guide should be symlinked into every app repository that deploys to this server:

```bash
# From any app repo on the server
ln -sf /Users/yancyshepherd/Projects/ubuntumac-server/SERVER_MASTER_GUIDE.md

# Or from the server (apps already have symlinks)
ls -la /opt/apps/apps/*/SERVER-GUIDE.md
ls -la /opt/apps/assistant-365-bridge/SERVER-GUIDE.md
```

### Include in AI Workspaces

When working on any app that deploys to this server:

1. **Open this guide** in the workspace alongside the app code
2. **AI reads this file** to understand server architecture
3. **AI follows patterns** defined here for deployments
4. **AI proposes updates** when infrastructure changes

### File Locations

| Location | Purpose |
|----------|--------|
| `/Users/yancyshepherd/Projects/ubuntumac-server /SERVER_MASTER_GUIDE.md` | **Master copy** (local Mac) |
| `/opt/apps/apps/*/SERVER-GUIDE.md` | Symlinks in app repos |
| `pcloud:ServerBackups/ubuntumac/configs/` | Backed up copy |

### Updating the Guide

```bash
# After any infrastructure change:
1. Edit SERVER_MASTER_GUIDE.md in the ubuntumac-server workspace
2. Run: /opt/apps/scripts/pcloud-backup.sh  # Sync to pCloud
3. Symlinks automatically reflect changes
```

---

## 🔀 15. Cloudflare Tunnel Routing Patterns

### 15.1 Current Configuration

The Cloudflare Tunnel (`a450abe1-40ef-4c37-908e-acbef4f3a25b`) is currently **remotely managed** via Cloudflare One:

- Cloudflare One → Networks → Connectors → Cloudflare Tunnels → (select tunnel) → **Published application routes**

The container still mounts `/home/yancmo/.cloudflared/` read-only into `infra-new-cloudflared-1` at `/etc/cloudflared/` for tunnel identity and credentials, but **hostname routing is controlled upstream**.

To verify what config the connector is actively using, check for log lines like:
```bash
sudo docker logs infra-new-cloudflared-1 --tail 200
# Look for: "Updated to new configuration" and the active ingress JSON
```

| Hostname | Service | Pattern | Notes |
|----------|---------|---------|-------|
| `watchsteps.shepswork.com` | `https://localhost:443` | ✅ **Traefik** | Static site (moved off `*.yancmo.xyz`) |
| `yancmo.xyz` | `https://localhost:443` | ✅ **Traefik** | Parked landing page |
| `stridelog-weather.yancmo.xyz` | `https://localhost:443` | ✅ **Traefik** | Recommended |
| `lms.yancmo.xyz` | `https://localhost:443` | ✅ **Traefik** | Recommended |
| `travel.yancmo.xyz` | `https://localhost:443` | ✅ **Traefik** | Travel Journal (React + Node.js + PostgreSQL) |
| `binge.yancmo.xyz` | `http://localhost:8081` | ⚠️ Direct | Should migrate to 443 |
| `assistant.yancmo.xyz` | `http://localhost:3000` | ⚠️ Direct | Should migrate to 443 |
| `clashmap.yancmo.xyz` | `http://localhost:5552` | ⚠️ Direct | Should migrate to 443 |

### 15.2 Routing Patterns Explained

**Pattern A: Through Traefik (Port 443) - RECOMMENDED**
```
Cloudflare → Tunnel → https://localhost:443 → Traefik → Container
```
- Traefik routes based on Host header
- Centralized TLS termination
- Health checks, load balancing, metrics
- Container only needs internal port exposure
- Requires Traefik labels on container

**Pattern B: Direct to Container Port - LEGACY**
```
Cloudflare → Tunnel → http://localhost:PORT → Container
```
- Bypasses Traefik entirely
- Each service exposes its own port
- No centralized management
- Inconsistent configuration

### 15.3 Migration to Traefik (Port 443)

To migrate a direct-port service to Traefik:

1. **Add Traefik labels** to the service in `docker-compose.yml`:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=edge"
  - "traefik.http.routers.<service>.rule=Host(`${<SERVICE>_HOST}`)"
  - "traefik.http.routers.<service>.entrypoints=websecure"
  - "traefik.http.routers.<service>.tls=true"
  - "traefik.http.services.<service>.loadbalancer.server.port=<internal-port>"
```

2. **Add to edge network**:
```yaml
networks:
  - edge
```

3. **Update Cloudflare Tunnel** (remotely managed):
   - Cloudflare One → Published application routes → edit the hostname
   - Set origin to `https://localhost:443`
   - Under Additional origin settings, set either:
     - **Match SNI to Host** = ✅ true (preferred), or
     - **No TLS Verify** = ✅ true

4. **Restart services**:
```bash
cd /opt/infra-new/compose
sudo docker compose up -d <service>
```

### 15.4 Managing Tunnel Routes

Tunnel routes (hostname → origin) are primarily managed in Cloudflare One (Published application routes).

After changing routes, validate from the server:
```bash
curl -i --max-time 10 https://<hostname>/api/health
sudo docker logs infra-new-cloudflared-1 --tail 100
```

### 15.5 Adding a New Service

For any new service that needs public HTTPS access:

1. Add service to `docker-compose.yml` with Traefik labels
2. Add `<SERVICE>_HOST` to `.env`
3. Deploy: `sudo docker compose up -d <service>`
4. Add hostname in Cloudflare One → Published application routes:
  - Hostname: `<service>.yancmo.xyz`
  - Service: `https://localhost:443`
  - Additional origin settings: **Match SNI to Host** ✅ (preferred) or **No TLS Verify** ✅

5. Verify:
```bash
curl -i --max-time 10 https://<service>.yancmo.xyz/
sudo docker logs infra-new-cloudflared-1 --tail 100
```

---

## 📱 16. StrideLog Weather Backend

**Container**: `infra-new-stridelog-weather-1`  
**Port**: 5562 (internal only)  
**Image**: Built from `/opt/apps/stridelog-weather/`  
**API Endpoint**: `https://stridelog-weather.yancmo.xyz`

### 16.1 Purpose
Provides historical weather data for the StrideLog iOS app via Visual Crossing API. Used for race weather lookups older than 10 days (WeatherKit only provides ~10 days of history).

### 16.2 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/weather/history` | GET | Historical weather data |

**Example Request:**
```bash
curl "https://stridelog-weather.yancmo.xyz/weather/history?lat=32.7767&lon=-96.7970&date=2024-01-15&time=09:00"
```

**Response:**
```json
{
  "source": "visualcrossing",
  "units": "imperial",
  "attribution": true,
  "daily": {
    "temp": 45.2,
    "conditions": "Partly cloudy",
    "humidity": 65,
    "wind_speed": 8.5
  }
}
```

### 16.3 Environment Variables
- `VC_API_KEY`: Visual Crossing API key
- `PORT`: 5562
- `FLASK_ENV`: production

### 16.4 Maintenance
```bash
# View logs
sudo docker logs -f infra-new-stridelog-weather-1

# Restart
cd /opt/infra-new/compose
sudo docker compose restart stridelog-weather

# Rebuild after code changes
scp app.py requirements.txt Dockerfile yancmo@100.105.31.42:/opt/apps/stridelog-weather/
ssh yancmo@100.105.31.42 "cd /opt/infra-new/compose && sudo docker compose build stridelog-weather && sudo docker compose up -d stridelog-weather"
```

---

## 🛡️ 17. Pi-hole (Tailscale-only DNS + Admin UI)

Pi-hole is deployed as a Docker service in the `infra-new` Compose stack, but is intentionally **not exposed publicly** (no Traefik route, no Cloudflare Tunnel hostname). It is reachable only over **Tailscale**.

### 17.1 Implementation Pattern (Ports / Collisions)

Because Traefik already owns host ports **80/443**, Pi-hole uses **Pattern B (alternate UI port)**:

- **DNS**: bound to the server’s **Tailscale IP only** on port **53/TCP+UDP**
- **Admin UI**: bound to the server’s **Tailscale IP only** on port **8082/TCP**

This provides “Tailscale-only” access without firewall changes.

⚠️ Note: binding to `100.105.31.42` means Pi-hole depends on Tailscale being up. If Tailscale is down at container start, Docker may fail to bind ports.

To make this reliable across reboots, a systemd unit is installed that waits for the Tailscale IP to exist before starting Pi-hole.

### 17.2 Data Paths (Persistent)

Persistent config is stored under:
```
/home/yancmo/apps/pihole/
├── etc-pihole/
└── etc-dnsmasq.d/
```

### 17.3 Environment Variables (.env)

Set these in `/opt/infra-new/compose/.env`:
```bash
PIHOLE_TZ=America/Chicago
PIHOLE_WEBPASSWORD=<set-a-strong-password>
PIHOLE_UI_PORT=8082
PIHOLE_TAILSCALE_IP=100.105.31.42
PIHOLE_UPSTREAM_DNS_1=1.1.1.1
PIHOLE_UPSTREAM_DNS_2=1.0.0.1
```

If you generated a random password during install and want to retrieve it later:
```bash
sudo egrep '^PIHOLE_WEBPASSWORD=' /opt/infra-new/compose/.env
```

Notes:
- The web password is persisted under `/home/yancmo/apps/pihole/etc-pihole/` (mounted into `/etc/pihole/`).
- On subsequent container restarts/recreates, the `WEBPASSWORD` environment variable may be ignored if a password is already set in the persisted config.

Reset the web password (recommended if login fails):
```bash
sudo docker exec infra-new-pihole-1 pihole setpassword '<new-password>'
```

### 17.4 Compose Service (reference)

Service name: `pihole` (container becomes `infra-new-pihole-1`).

Key points:
- Attach to `backend` network
- Publish ports **only** on the Tailscale IP
- Mount the two persistent config directories

### 17.5 Using Pi-hole from iPhone (Tailscale)

Recommended approach:
1. Install/enable Tailscale on iPhone and connect to tailnet
2. In Tailscale app: DNS → add nameserver `100.105.31.42` (Pi-hole)
3. Toggle Tailscale on/off to enable/disable Pi-hole filtering for the iPhone

### 17.5.1 Listening Mode Configuration (CRITICAL)

**Status**: ✅ **Fixed** (January 25, 2026)

Pi-hole must be configured to accept DNS queries from Tailscale devices. By default, Pi-hole uses `LOCAL` listening mode, which rejects queries from non-local networks (including Tailscale IPs like `100.122.189.114`).

**Symptom**: DNS queries timeout; Pi-hole logs show `"WARNING: dnsmasq: ignoring query from non-local network <tailscale-ip>"`

**Fix applied**:
1. Set environment variable in docker-compose.yml: `DNSMASQ_LISTENING: all`
2. Modified `/etc/pihole/pihole.toml` (persisted in `/home/yancmo/apps/pihole/etc-pihole/`):
   ```toml
   listeningMode = "ALL"
   ```
3. Restarted Pi-hole container

**Verification**:
```bash
# Check listening mode
sudo docker exec infra-new-pihole-1 pihole-FTL --config | grep listeningMode
# Should show: dns.listeningMode = ALL

# Test DNS from Tailscale device
dig @100.105.31.42 google.com +short
# Should return IP addresses (e.g., 142.250.190.142)

# Test ad blocking
dig @100.105.31.42 doubleclick.net +short
# Should return 0.0.0.0 (blocked)
```

**Important**: The listening mode is stored in both:
- `/home/yancmo/apps/pihole/etc-pihole/pihole.toml` (persistent, survives restarts)
- Pi-hole FTL database (regenerated from pihole.toml on container recreate)

If Pi-hole is recreated and reverts to LOCAL mode, reapply the fix:
```bash
# Stop container
cd /opt/infra-new/compose && sudo docker compose -p infra-new stop pihole

# Fix pihole.toml
sudo docker exec infra-new-pihole-1 sed -i 's/listeningMode = "LOCAL"/listeningMode = "ALL"/' /home/yancmo/apps/pihole/etc-pihole/pihole.toml

# Or from host
sudo sed -i 's/listeningMode = "LOCAL"/listeningMode = "ALL"/' /home/yancmo/apps/pihole/etc-pihole/pihole.toml

# Restart
sudo docker compose -p infra-new start pihole
```

### 17.6 Validation

From a Tailscale-connected client device:
- Admin UI: `http://100.105.31.42:8082/admin`
- DNS resolution (example): `dig @100.105.31.42 example.com`
- Ad-block check: browse to an ad-heavy site and confirm blocking increases in Pi-hole Query Log

If you need a quick on-server sanity check (bypassing the Tailscale IP bind), query the container IP directly:
```bash
PIHOLE_IP=$(sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' infra-new-pihole-1)
dig @$PIHOLE_IP example.com +short
```

### 17.6.1 Resetting the Pi-hole Web Admin Password (on-server)

If you lose the Pi-hole admin password or need to reset it from the server, run one of the following (all commands run on the server):

- Set a specific password (non-interactive):

```bash
sudo docker exec infra-new-pihole-1 pihole setpassword 'YourNewPasswordHere'
```

- Generate and set a random password (example):

```bash
NEW_PASS=$(openssl rand -base64 16 | tr -d '/=+' | head -c 16)
echo "New password: $NEW_PASS"            # save it securely
sudo docker exec infra-new-pihole-1 pihole setpassword "$NEW_PASS"
```

- Remove the password (allow login without password):

```bash
sudo docker exec infra-new-pihole-1 pihole setpassword
```

Important: If you store the web password in `/opt/infra-new/compose/.env`, update it there as well so container restarts use the correct value:

```bash
sudo sed -i "s/^PIHOLE_WEBPASSWORD=.*/PIHOLE_WEBPASSWORD=<new-password>/" /opt/infra-new/compose/.env
```

Security note: Treat the admin password as a secret. Do not commit plaintext passwords to git or other source control. Prefer a secure password manager.

### 17.7 Rollback

To disable Pi-hole quickly:
- Stop the service: `cd /opt/infra-new/compose && sudo docker compose -p infra-new stop pihole`

To remove Pi-hole completely (data-preserving):
- `cd /opt/infra-new/compose && sudo docker compose -p infra-new rm -f pihole`
- Keep `/home/yancmo/apps/pihole/` intact unless you explicitly want to delete config.

### 17.8 Boot / Reboot Reliability (systemd)

Because Pi-hole binds host ports specifically to the Tailscale IP (`100.105.31.42`), a reboot can create a race where Docker starts before Tailscale assigns the IP. If Pi-hole starts too early, it may fail with:

- `failed to bind host port for 100.105.31.42:53 ... cannot assign requested address`

To prevent this, the server uses a systemd unit:

- Unit file: `/etc/systemd/system/infra-new-pihole.service`
- Behavior: waits for `tailscale0` to have `100.105.31.42/32`, then runs `docker compose -p infra-new up -d pihole`

Verify it’s enabled and working:
```bash
systemctl is-enabled infra-new-pihole.service
systemctl status infra-new-pihole.service --no-pager -n 60
docker ps --filter name=infra-new-pihole-1
```

Restart Pi-hole via the unit:
```bash
sudo systemctl start infra-new-pihole.service
```

Disable boot-start (rollback):
```bash
sudo systemctl disable --now infra-new-pihole.service
```

---

## 📊 18. Observability Stack (Prometheus + Grafana + Loki) + Portainer

Deployed January 15, 2026 as part of the `infra-new` Compose stack. Provides metrics collection, log aggregation, visualization, and safe container operations.

### 18.1 Overview

The server uses a full observability stack to provide:
- **Metrics (Prometheus)**: host + container metrics, plus Traefik request/router/service metrics
- **Dashboards (Grafana)**: visual monitoring + alerting views
- **Logs (Loki + Promtail)**: centralized log search and correlation
- **Operations (Portainer)**: safe, GUI-based container restart/control

**Access pattern**: All observability admin UIs are accessed via **Tailscale-only DNS** (hostnames resolve to `100.105.31.42`), bypassing Cloudflare Tunnel for enhanced privacy.

---

### 18.2 Stack Components

| Service | Image | Internal Port | Purpose |
|---------|-------|---------------|---------|
| `prometheus` | prom/prometheus:v2.54.1 | 9090 | Metrics collection & storage |
| `grafana` | grafana/grafana:latest | 3000 | Dashboards & visualization |
| `loki` | grafana/loki:3 | 3100 | Log aggregation |
| `promtail` | grafana/promtail:3 | - | Log shipping to Loki |
| `node-exporter` | prom/node-exporter:latest | 9100 | Host system metrics |
| `cadvisor` | gcr.io/cadvisor/cadvisor:latest | 8080 | Container metrics |
| `portainer` | portainer/portainer-ce:latest | 9000 | Docker management UI |

**Compose project**: `infra-new`  
**Compose directory**: `/opt/infra-new/compose`  
**Networks**: Services use the same `edge`/`backend` network strategy as Traefik

---

### 18.3 Access & Security (Tailscale-Only)

**Status**: ✅ **Configured** (January 16, 2026)

**Security note (2026-03-11):** Portainer briefly resolved through **Cloudflare proxy IPs** instead of the Tailscale IP, which caused Chrome to show a red **Dangerous site** interstitial. After the Cloudflare route was removed and the DNS record returned to **DNS only**, the Portainer-specific Traefik allowlist was removed as well because it produced false `403` responses for legitimate Tailscale access. The current intended state is:
- Cloudflare DNS record for `portainer.yancmo.xyz` = **DNS only** (gray cloud)
- No Cloudflare Tunnel published route for `portainer.yancmo.xyz`
- Portainer routed the same way as the other Tailscale DNS-only observability UIs

All observability services are accessible **only via Tailscale network** using Tailscale IP-based DNS.

#### DNS Configuration

All records point to the **Tailscale IP** in Cloudflare DNS:
- Type: `A`
- Content: `100.105.31.42` (server's Tailscale IP)
- Proxy status: **DNS only** (gray cloud - no Cloudflare proxy)

**Access URLs:**
- **Grafana**: `https://grafana.yancmo.xyz`
- **Prometheus**: `https://prom.yancmo.xyz`
- **Portainer**: `https://portainer.yancmo.xyz`

#### How It Works

**Direct Tailscale Connection:**
```
Client (on Tailscale)
  → DNS lookup: grafana.yancmo.xyz = 100.105.31.42
  → Direct HTTPS connection via Tailscale network
  → Traefik (on server)
  → Grafana container
```

**Cloudflare Tunnel is bypassed** - traffic flows entirely within the private Tailscale network.

#### Access Behavior

**When ON Tailscale:**
- DNS resolves to `100.105.31.42`
- Direct HTTPS connection to server via Tailscale
- Services load normally
- ⚠️ **Browser shows "Not Secure" certificate warning** (expected - see below)

**When NOT on Tailscale:**
- DNS still resolves to `100.105.31.42`
- Connection times out (Tailscale IPs are not routable on public internet)
- Cannot access services

#### Certificate Trust (Resolved)

As of **2026-03-11**, Traefik now serves a publicly trusted Let's Encrypt wildcard certificate for Tailscale-only DNS hostnames.

Implemented state:
- `CF_DNS_API_TOKEN` set in `/opt/infra-new/compose/.env` (single active entry)
- Traefik resolver: `certificatesResolvers.cloudflare.acme` (DNS-01 provider: Cloudflare)
- `websecure` entrypoint default resolver: `cloudflare`
- Dynamic TLS store (`/home/yancmo/infra/traefik/dynamic/tls.yml`) uses `defaultGeneratedCert`:
  - `main: yancmo.xyz`
  - `sans: '*.yancmo.xyz'`

Validation evidence (2026-03-11):
- `openssl s_client` for `portainer.yancmo.xyz`, `grafana.yancmo.xyz`, `prom.yancmo.xyz` returned:
  - `issuer= /C=US/O=Let's Encrypt/CN=R12`
  - `subject= /CN=yancmo.xyz`
- Browser/CLI TLS validation no longer requires bypass:
  - `curl -I https://portainer.yancmo.xyz` → `HTTP/2 200`
  - `curl -I https://grafana.yancmo.xyz` → `HTTP/2 302`
  - `curl -I https://prom.yancmo.xyz` → `HTTP/2 405` (Prometheus HEAD behavior)

If trust warnings return, check in order:
1. `grep '^CF_DNS_API_TOKEN=' /opt/infra-new/compose/.env` (ensure only one, non-placeholder value)
2. `sed -n '1,80p' /home/yancmo/infra/traefik/dynamic/tls.yml` (must be `defaultGeneratedCert`)
3. `cd /opt/infra-new/compose && sudo docker compose -p infra-new up -d traefik`
4. `python3 -c "import json; d=json.load(open('/home/yancmo/infra/traefik/acme/acme.json')); print([(c.get('domain',{}).get('main'), c.get('domain',{}).get('sans')) for c in d.get('cloudflare',{}).get('Certificates',[])])"`

---

### 18.4 Persistent Data & Configuration

**Data storage** (under `/home/yancmo/apps/observability/`):
```
/home/yancmo/apps/observability/
├── prometheus/   # Prometheus TSDB storage
├── grafana/      # Grafana database + plugins
├── loki/         # Loki chunks/index storage
└── portainer/    # Portainer data
```

**Configuration files** (under `/opt/infra-new/compose/observability/`):
```
/opt/infra-new/compose/observability/
├── prometheus/
│   └── prometheus.yml         # Scrape targets
├── loki/
│   └── loki-config.yml        # Storage & retention
├── promtail/
│   └── promtail-config.yml    # Log shipping config
└── grafana/
    └── provisioning/
        ├── datasources/       # Prometheus + Loki
        └── dashboards/        # Dashboard provider
```

---

### 18.5 Prometheus: Targets & Metrics

#### Scrape Targets

Configured in `/opt/infra-new/compose/observability/prometheus/prometheus.yml`:

| Target | Endpoint | Metrics |
|--------|----------|---------|
| prometheus | localhost:9090 | Self-monitoring |
| node-exporter | node-exporter:9100 | Host CPU, memory, disk, network |
| cadvisor | cadvisor:8080 | Container CPU, memory, network |
| traefik | traefik:8080 | Request counts, latencies, routers |
| loki | loki:3100 | Ingester, query stats |

#### Traefik Metrics (Requests / Routers / Services)

Traefik metrics are enabled via command flags:
- `--metrics.prometheus=true`
- `--metrics.prometheus.addEntryPointsLabels=true`
- `--metrics.prometheus.addServicesLabels=true`
- `--metrics.prometheus.addRoutersLabels=true`

This provides:
- **requests/min** per service
- **4xx/5xx error rates**
- **latency percentiles** (where available)
- **top routers/services** by traffic

This is a key benefit of routing services through Traefik (Pattern A) - centralized observability.

#### Verification

Confirm targets are UP:
```bash
# Via Prometheus web UI (internal)
# Navigate to: Status → Targets

# Via API
curl -k https://prom.yancmo.xyz/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

---

### 18.6 Logs (Loki + Promtail)

Promtail ships Docker JSON logs from:
```
/var/lib/docker/containers/*/*-json.log
```

**In Grafana:**
- Navigate to **Explore** → select **Loki** datasource
- Filter by container/service labels
- Example query: `{container_name=~"infra-new.*"}`
- Correlate log spikes with Traefik metrics or container restarts

**Promtail configuration:** `/opt/infra-new/compose/observability/promtail/promtail-config.yml`

---

### 18.7 Grafana: Datasources & Dashboards

#### Auto-provisioned Datasources

Located in `/opt/infra-new/compose/observability/grafana/provisioning/datasources/`:

| Name | Type | URL | Default |
|------|------|-----|---------|
| Prometheus | prometheus | http://prometheus:9090 | ✅ |
| Loki | loki | http://loki:3100 | ❌ |

#### Dashboard Provisioning

Dashboard provider configured in `/opt/infra-new/compose/observability/grafana/provisioning/dashboards/dashboards.yml`

**Recommended dashboards to import:**
- Node Exporter Full (ID: 1860)
- cAdvisor (ID: 14282)
- Traefik 2.0 (ID: 11462)

---

### 18.8 Portainer: Container Operations

Portainer is used for:
- Restart containers safely
- Inspect container env/config
- Tail logs (quick diagnostics)
- View resource usage

#### Routing Note

Portainer is routed through Traefik.

Historically, Portainer used a **file provider** route (instead of Docker labels):
- File: `/home/yancmo/infra/traefik/dynamic/portainer.yml`
- This file is watched by Traefik and auto-reloaded

Regardless of whether routing is defined via **Docker labels** or the **file provider**, Portainer must be **Tailscale-only**.

**Security note:** Portainer requires Docker socket access. Keep it private (Tailscale-only). Do not expose publicly without strong access controls.

#### Bring Portainer Online (Tailscale)

Symptoms:
- `https://portainer.yancmo.xyz` times out / 404 / 502
- `docker ps | grep portainer` shows nothing

On the server:
```bash
cd /opt/infra-new/compose

# Start/recreate the service
sudo docker compose -p infra-new up -d portainer

# Confirm it is running
sudo docker compose -p infra-new ps portainer
sudo docker logs infra-new-portainer-1 --tail 50
```

From a Tailscale-connected client:
```bash
dig +short portainer.yancmo.xyz   # should be 100.105.31.42

# HTTPS (will show a browser cert warning due to Cloudflare Origin cert)
curl -Ik https://portainer.yancmo.xyz

# Optional: HTTP (no browser cert warning)
curl -I http://portainer.yancmo.xyz
```

#### Tailscale-only Hardening (Recommended)

Because Traefik listens on host ports **80/443**, Portainer must never be publicly routed. In practice, the reliable control for this host is:

- `portainer.yancmo.xyz` resolves to the server’s **Tailscale IP** (`100.105.31.42`)
- Cloudflare record is **DNS only**
- there is **no Cloudflare Tunnel published route** for Portainer

An additional Portainer-specific `ipAllowList` was tested on 2026-03-11, but removed the same day because it caused false `403` responses for legitimate Tailscale access after Docker/Tailscale source-IP translation.

Recommended file-provider config (`/home/yancmo/infra/traefik/dynamic/portainer.yml`):
```yaml
http:
  routers:
    # HTTPS
    portainer:
      rule: "Host(`portainer.yancmo.xyz`)"
      priority: 1000
      entryPoints:
        - websecure
      tls: {}
      service: portainer

    # HTTP (optional; allows http://portainer.yancmo.xyz without cert warnings)
    portainer-http:
      rule: "Host(`portainer.yancmo.xyz`)"
      priority: 1000
      entryPoints:
        - web
      service: portainer

  services:
    portainer:
      loadBalancer:
        passHostHeader: true
        servers:
          - url: "http://portainer:9000"
```

**Live validation from 2026-03-11:**
- `getent hosts portainer.yancmo.xyz` on the server returned **Cloudflare IPv6 proxy addresses**, confirming the hostname was not DNS-only.
- Before the mitigation, `curl -skI https://portainer.yancmo.xyz` returned **HTTP/2 200** from Portainer behind Cloudflare.
- After the DNS/tunnel cleanup and removal of the extra allowlist, both `curl -skI https://100.105.31.42 -H "Host: portainer.yancmo.xyz"` and `curl -skI https://portainer.yancmo.xyz` returned **HTTP/2 200** again.

**Recommended follow-up outside the server:**
1. Keep `portainer.yancmo.xyz` as **DNS only** in Cloudflare.
2. Keep Portainer **absent** from Cloudflare Tunnel / Published Routes.
3. Re-test from:
   - a Tailscale-connected client → Portainer should load
   - a non-Tailscale/public client → should fail / timeout because `100.105.31.42` is not publicly routable

If Docker labels are used for Portainer routing in the future, prefer the same DNS-only Tailscale pattern first. Only reintroduce a dedicated allowlist after validating that the real client source IP is preserved end-to-end.

---

### 18.9 Data Retention

| Component | Retention | Storage Location |
|-----------|-----------|------------------|
| Prometheus | 30 days | /home/yancmo/apps/observability/prometheus |
| Loki | 14 days | /home/yancmo/apps/observability/loki |
| Grafana | Unlimited | /home/yancmo/apps/observability/grafana |
| Portainer | N/A | /home/yancmo/apps/observability/portainer |

---

### 18.10 Environment Variables

Set in `/opt/infra-new/compose/.env`:
```bash
GRAFANA_HOST=grafana.yancmo.xyz
PROM_HOST=prom.yancmo.xyz
PORTAINER_HOST=portainer.yancmo.xyz
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<generated-password>
```

**Credentials policy:** Do not record live credentials in this guide. Store in password manager. If credentials are ever exposed in chat/docs/screenshots, rotate immediately.

---

### 18.11 Common Commands & Validation

#### Check All Observability Containers
```bash
docker ps | grep -E "(prometheus|grafana|loki|promtail|node-exporter|cadvisor|portainer)"
```

#### Check Prometheus Targets
```bash
sudo docker exec infra-new-prometheus-1 wget -q -O- http://localhost:9090/api/v1/targets | python3 -c "import sys,json; d=json.load(sys.stdin)['data']['activeTargets']; [print(f\"{t['labels']['job']}: {t['health']}\") for t in d]"
```

#### Check Prometheus Health
```bash
docker exec infra-new-prometheus-1 wget -qO- http://localhost:9090/-/healthy
```

#### Check Loki Readiness
```bash
docker exec infra-new-loki-1 wget -qO- http://localhost:3100/ready
```

#### View Promtail Logs (Log Shipping)
```bash
docker logs infra-new-promtail-1 --tail 100
```

#### View Grafana Logs
```bash
docker logs infra-new-grafana-1 --tail 50
```

#### Restart Observability Stack
```bash
cd /opt/infra-new/compose
docker compose -p infra-new restart prometheus grafana loki promtail
```

#### Access Verification (Tailscale)
```bash
# Check DNS resolution
dig +short grafana.yancmo.xyz  # Should return: 100.105.31.42
dig +short prom.yancmo.xyz     # Should return: 100.105.31.42
dig +short portainer.yancmo.xyz # Should return: 100.105.31.42

# Test access (on Tailscale)
tailscale status  # Confirm connected
curl -Ik https://grafana.yancmo.xyz  # HTTP 302 → /login
curl -Ik https://prom.yancmo.xyz     # HTTP 200
curl -Ik https://portainer.yancmo.xyz # HTTP 200

# Test inaccessible (off Tailscale)
tailscale down
curl -Ik https://grafana.yancmo.xyz  # Connection timeout
```

---

### 18.12 Troubleshooting & Known Issues

#### Promtail/Loki healthcheck shows "unhealthy"
**Expected** during startup when old logs are rejected (Loki has 7-day max ingestion window). Logs are still being collected.

#### Portainer healthcheck shows "unhealthy"
The Portainer image doesn't include curl/wget. The service works fine despite the healthcheck status.

#### Snap Prometheus was conflicting on port 9090
**Resolved**: Disabled via `sudo snap disable prometheus`. The Docker Prometheus is the active instance.

#### Prometheus shows targets DOWN
- Verify container DNS and networks (`backend` network)
- Confirm scrape endpoints are reachable
- Check Traefik metrics flags if scraping Traefik

#### No logs in Loki
- Confirm Promtail container can read Docker JSON logs
- Check Promtail logs for permission/path errors
- Verify Grafana Loki datasource points at `http://loki:3100`

#### Grafana login issues
- Confirm `GRAFANA_ADMIN_PASSWORD` in `.env`
- Check persistence mount is correct: `/home/yancmo/apps/observability/grafana`
- Verify Grafana container has write permissions (UID 472)

#### Certificate warnings in browser
**Expected** - see Section 18.3. Connection is still encrypted via TLS.

#### Chrome shows a red "Dangerous site" warning for Portainer
This is **not** the normal Cloudflare Origin certificate warning. Treat it as an exposure/reputation incident.

Check in this order:
```bash
# On the server
getent hosts portainer.yancmo.xyz
curl -skI https://portainer.yancmo.xyz
sed -n '1,120p' /home/yancmo/infra/traefik/dynamic/portainer.yml
sed -n '1,200p' /home/yancmo/.cloudflared/config.yml
```

Interpretation:
- If DNS resolves to **Cloudflare IPs** (`2606:4700:*`, `104.*`, `172.67.*`, etc.), the hostname is being proxied publicly.
- If the response is `HTTP 200` from Portainer through Cloudflare, the admin UI is exposed.
- If the response is `HTTP 403`, check whether a leftover Portainer-specific allowlist is still present in `/home/yancmo/infra/traefik/dynamic/portainer.yml`.

Rollback for the 2026-03-11 final fix:
```bash
sudo cp /home/yancmo/infra/traefik/dynamic/portainer.yml.bak.20260311-1121 /home/yancmo/infra/traefik/dynamic/portainer.yml
```

---

### 18.13 Rollback

To disable observability quickly:
```bash
cd /opt/infra-new/compose
docker compose -p infra-new stop prometheus grafana loki promtail node-exporter cadvisor portainer
```

To remove containers but keep data:
```bash
cd /opt/infra-new/compose
docker compose -p infra-new rm -f prometheus grafana loki promtail node-exporter cadvisor portainer
# Keep /home/yancmo/apps/observability/ intact unless you explicitly want to delete config/data
```

Full rollback with backup restore:
```bash
cd /opt/infra-new/compose
docker compose -p infra-new down
sudo rsync -a --delete /opt/infra-new/compose.bak.2026-01-15_222054/ /opt/infra-new/compose/
docker compose -p infra-new up -d
```

---

## 📺 19. DLNA Media Server (minidlna)

**Container**: `infra-new-minidlna-1`  
**Image**: `vladgh/minidlna:latest`  
**Network Mode**: host (required for SSDP/UPnP discovery)  
**Status**: ✅ Running (deployed January 26, 2026)

### 19.1 Purpose
Streams media from `/mnt/media/` to DLNA-compatible devices (LG webOS TV, game consoles, mobile devices) over the local network using UPnP/DLNA protocol.

### 19.2 Media Directories
- **Movies**: `/mnt/media/Movies` (read-only)
- **TV Shows**: `/mnt/media/TV` (read-only)
- **Cache/DB**: `/home/yancmo/apps/minidlna/cache`

### 19.3 Network & Ports
- **HTTP Interface**: `http://192.168.50.97:8200/`
- **SSDP Discovery**: Port 1900/UDP (UPnP)
- **Network**: `host` mode (required for multicast discovery)
- **Access**: Local network only (`192.168.50.0/24`)

### 19.4 Environment Variables
Set in `/opt/infra-new/compose/.env`:
```bash
MINIDLNA_NAME=ubuntumac Media Server
```

### 19.5 Common Commands
```bash
# View logs
sudo docker logs -f infra-new-minidlna-1

# Restart (e.g., after adding new media)
cd /opt/infra-new/compose
sudo docker compose -p infra-new restart minidlna

# Force library rescan
sudo docker compose -p infra-new restart minidlna
sudo docker logs infra-new-minidlna-1 | grep -i "scan"

# Check media count via HTTP interface
curl -s http://192.168.50.97:8200/ | grep -E "Audio|Video|Image"

# Rebuild cache from scratch
sudo docker compose -p infra-new stop minidlna
sudo rm -rf /home/yancmo/apps/minidlna/cache/*
sudo docker compose -p infra-new start minidlna
```

### 19.6 LG webOS TV Setup
1. Open **Media Player** or **LG Content Store** app
2. Navigate to **Photos & Videos** → **All Servers**
3. Select **"ubuntumac Media Server"**
4. Browse **Movies** or **TV** folders
5. Play any video file

**Note**: First discovery can take 1-2 minutes. If server doesn't appear, restart TV network or check server logs.

### 19.7 Troubleshooting

**Server not appearing on TV:**
```bash
# Check container is running
docker ps | grep minidlna

# Verify SSDP broadcasts
sudo tcpdump -i any -n port 1900 and host 239.255.255.250

# Check HTTP interface
curl -I http://192.168.50.97:8200/
```

**Playback stuttering/buffering:**
- Check network speed (should be 100 Mbps+ for HD)
- Review media file bitrate (4K content may need wired connection)
- Check server load: `docker stats infra-new-minidlna-1`

**New media not showing:**
- Wait 5-10 minutes for inotify to trigger rescan
- Or restart container: `sudo docker compose -p infra-new restart minidlna`

### 19.8 Media Library Updates
minidlna automatically watches for new files via `inotify`. When you add new media to `/mnt/media/`, it should appear within 5-10 minutes. For immediate updates, restart the container.

### 19.9 Security Notes
- minidlna uses `host` network mode for SSDP multicast discovery
- Port 8200 is restricted to local network only via iptables (Section 6.5.2)
- Not exposed via Traefik/Cloudflare Tunnel
- Read-only access to media files

### 19.10 Rollback
To disable minidlna:
```bash
cd /opt/infra-new/compose
sudo docker compose -p infra-new stop minidlna
```

To remove completely:
```bash
sudo docker compose -p infra-new rm -f minidlna
sudo rm -rf /home/yancmo/apps/minidlna
```

---

## 🌐 20. Oracle Cloud Infrastructure (OCI) VM

**Status**: ✅ **Active** (deployed February 3, 2026)

### 20.1 Overview

| Property | Value |
|----------|-------|
| **Provider** | Oracle Cloud Infrastructure (OCI) |
| **Public IP** | `147.224.178.93` |
| **Tailscale IP** | `100.81.231.58` |
| **OS** | Canonical Ubuntu 22.04 Minimal aarch64 |
| **Instance Name** | yancmos server |
| **Shape** | VM.Standard.A1.Flex |
| **CPU** | 1 OCPU |
| **Memory** | 6 GB |
| **Storage** | PARAVIRTUALIZED |
| **Region** | us-chicago-1 (AD-1, FD-1) |
| **Network** | Tailscale-only (no public ports) |
| **Docker** | ✅ Pre-installed |

### 20.2 SSH Access
```bash
# Primary (via Tailscale - RECOMMENDED)
ssh ubuntu@100.81.231.58

# Alternative (if SSH config exists)
ssh oci-yancmos

# Direct via public IP (use only if Tailscale unavailable)
ssh ubuntu@147.224.178.93
```

**Authentication**: Key-based only (private key from SSH key pair used during instance creation)

**Access Policy**: 
- **Tailscale access** (`100.81.231.58`): Always available, encrypted through Tailscale network
- **Public IP access** (`147.224.178.93`): Available but not recommended for routine use
- No password authentication permitted
- Consider restricting public SSH via OCI Security Lists or firewall rules once Tailscale is confirmed stable

### 20.3 Purpose & Migration Plan

**Initial Migration** (in progress):
- COC Discord Bot (`coc-discord-bot`)
- Clan Map (`clan-map`)

**Rationale**:
- Offload services from primary `ubuntumac` host
- Isolate game-related services for better resource management
- Test Oracle Cloud's ARM architecture performance
- Leverage OCI's free tier (4 OCPU + 24 GB RAM always-free limit)

**Future considerations**:
- Additional services may be migrated based on resource utilization
- Tailscale-only access pattern provides consistent security model
- No public ingress required (all services accessed via Tailscale or Traefik on `ubuntumac`)

### 20.4 Infrastructure Pattern

This OCI instance follows the same infrastructure patterns as `ubuntumac`:
- Docker Compose orchestration
- Tailscale for private networking
- No direct public exposure
- Environment variables in `.env` files
- Persistent data under `/home/ubuntu/apps/`

**Network architecture**:
```
Internet (users) 
  ↓ HTTPS
Cloudflare Tunnel / Traefik (ubuntumac: 100.105.31.42)
  ↓ Tailscale network
OCI VM (100.81.231.58) - Docker containers
```

Services on OCI can be accessed:
- **Option A**: Via Tailscale IP directly (internal only)
- **Option B**: Proxied through `ubuntumac` Traefik (public HTTPS)

### 20.5 Directory Structure (Planned)

Expected layout after migration:
```
/home/ubuntu/
├── apps/
│   ├── coc-discord-bot/
│   │   ├── .env
│   │   └── data/
│   ├── clan-map/
│   │   ├── .env
│   │   └── data/
│   └── logs/
├── docker-compose.yml
└── .env
```

### 20.6 Docker Verification

Verify Docker is ready:
```bash
ssh ubuntu@100.81.231.58 'docker --version && docker compose version'
ssh ubuntu@100.81.231.58 'docker ps'
```

### 20.7 Tailscale Integration

**Status**: ✅ Connected to tailnet

Verify Tailscale connectivity:
```bash
# From any Tailscale-connected device
tailscale status | grep 100.81.231.58

# Test connectivity
ping -c 3 100.81.231.58
ssh ubuntu@100.81.231.58 'hostname && uptime'
```

### 20.8 Monitoring & Observability

**Recommendation**: Once services are deployed, export metrics to the `ubuntumac` Prometheus instance:
- Install `node-exporter` on OCI VM
- Configure Prometheus on `ubuntumac` to scrape `100.81.231.58:9100`
- Add OCI metrics to existing Grafana dashboards

### 20.9 Backup Strategy

**To be configured**:
- Deploy similar `pcloud-backup.sh` script for OCI VM
- Or: Centralized backup job running from `ubuntumac` that SSHs to OCI for database dumps
- Backup destination: Same `pcloud:ServerBackups/` with subdirectory `oci-yancmos/`

### 20.10 Maintenance Access

**Console access**: Available via Oracle Cloud Console
- Navigate to: Compute → Instances → yancmos server → Console → Launch Cloud Shell connection

Use console access only if Tailscale/SSH is unavailable.

### 20.11 Resource Monitoring

Track OCI instance usage:
```bash
# CPU/Memory/Disk
ssh ubuntu@100.81.231.58 'top -bn1 | head -20'
ssh ubuntu@100.81.231.58 'free -h'
ssh ubuntu@100.81.231.58 'df -h'

# Docker stats
ssh ubuntu@100.81.231.58 'docker stats --no-stream'
```

### 20.12 Known Limitations

**ARM Architecture (aarch64)**:
- Some Docker images may not have ARM builds
- Test image compatibility before migrating services
- Use `--platform linux/arm64` when building images

**OCI Free Tier**:
- 1 OCPU allocated (out of 4 OCPU free tier limit)
- 6 GB memory allocated (out of 24 GB free tier limit)
- Can scale up within free tier limits if needed

### 20.13 Security Posture

**Current state**:
- ✅ Public IP assigned (`147.224.178.93`)
- ✅ Tailscale-only access recommended (`100.81.231.58`)
- ✅ Key-based SSH authentication only
- ✅ In-transit encryption (TLS)
- ✅ Boot volume encryption (enabled)
- ✅ Secure Boot (disabled)

**Recommended hardening** (priority order):
1. **SSH access control** (HIGH PRIORITY):
   ```bash
   # Install fail2ban for SSH brute-force protection
   sudo apt update && sudo apt install -y fail2ban
   
   # Configure SSH to listen only on Tailscale IP (most secure)
   sudo sed -i 's/#ListenAddress 0.0.0.0/ListenAddress 100.81.231.58/' /etc/ssh/sshd_config
   sudo systemctl restart sshd
   
   # OR: Keep public SSH but restrict to known IPs via OCI Security Lists
   # (Configure in OCI Console → Networking → Security Lists)
   ```

2. **Firewall configuration**:
   ```bash
   # Default deny incoming, allow established
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   
   # Allow SSH from Tailscale network only
   sudo ufw allow from 100.64.0.0/10 to any port 22
   
   # Allow Docker/service ports as needed
   sudo ufw enable
   ```

3. **Enable automatic security updates**:
   ```bash
   sudo apt install -y unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

4. **Monitor SSH access attempts**:
   ```bash
   # View recent SSH attempts
   sudo journalctl -u ssh --since "24 hours ago" | grep -i "failed\|accepted"
   
   # Check fail2ban status (once installed)
   sudo fail2ban-client status sshd
   ```

**OCI Security Lists**:
- Default ingress rules may allow SSH (22) from `0.0.0.0/0`
- Review and restrict in: OCI Console → Compute → Instance → Primary VNIC → Subnet → Security Lists
- Recommended: Allow SSH only from your home/office IP or Tailscale subnet

### 20.14 Next Steps

1. ✅ Instance provisioned and accessible
2. ⏳ Migrate COC Discord Bot from `ubuntumac` to OCI
3. ⏳ Migrate Clan Map from `ubuntumac` to OCI
4. ⏳ Configure monitoring (node-exporter)
5. ⏳ Set up automated backups
6. ⏳ Update `ubuntumac` Traefik routes (if services need public access)
7. ⏳ Document final architecture in this guide

### 20.15 Rollback Plan

If migration encounters issues:
- Services remain running on `ubuntumac` (no downtime during migration)
- Simply don't update Traefik routes or DNS
- Delete OCI containers and restore backups on `ubuntumac` if needed

### 20.16 Future Expansion

**If OCI instance proves successful**:
- Consider migrating additional services:
  - BingeBox (media automation)
  - ClaimWatch (PWA + API)
  - Jellyfin (media streaming, if bandwidth supports it)
  
**Load distribution pattern**:
- `ubuntumac`: Traefik ingress, observability, core infra
- `oci-yancmos`: Gaming/utility services, compute-intensive tasks

