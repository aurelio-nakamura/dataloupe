#!/usr/bin/env bash
# launch.sh — one-shot, idempotent launch of dataloupe once a GitHub account exists.
# Safe to re-run: every step is guarded. Does NOT post to HN/reddit (that stays manual, one honest post).
#
# Usage:  bash scripts/launch.sh            # do it
#         DRY_RUN=1 bash scripts/launch.sh  # print what it would do
set -euo pipefail
cd "$(dirname "$0")/.."
run(){ if [ "${DRY_RUN:-0}" = 1 ]; then echo "+ $*"; else echo "+ $*"; "$@"; fi; }

# 0. Preconditions -----------------------------------------------------------
if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: gh not authenticated. Run 'gh auth login' (or set GH_TOKEN) first." >&2
  exit 1
fi
HANDLE="$(gh api user --jq .login)"
REPO="dataloupe"
SLUG="$HANDLE/$REPO"
echo "== Launching $SLUG (handle detected: $HANDLE) =="

# 1. Fix hard-coded handle if the real account differs from the placeholder ---
PLACEHOLDER="aurelio-nakamura"
if [ "$HANDLE" != "$PLACEHOLDER" ]; then
  echo "== Rewriting handle $PLACEHOLDER -> $HANDLE in repo metadata =="
  if [ "${DRY_RUN:-0}" != 1 ]; then
    grep -rl "$PLACEHOLDER" README.md package.json 2>/dev/null | while read -r f; do
      sed -i "s#$PLACEHOLDER#$HANDLE#g" "$f"; done
    npm run build >/dev/null 2>&1 || true
    git add -A && git commit -m "chore: set GitHub handle to $HANDLE" >/dev/null 2>&1 || true
  fi
fi

# 2. Create the repo and push (idempotent) -----------------------------------
if gh repo view "$SLUG" >/dev/null 2>&1; then
  echo "== repo $SLUG already exists; ensuring remote+push =="
  git remote get-url origin >/dev/null 2>&1 || run git remote add origin "https://github.com/$SLUG.git"
  run git push -u origin HEAD:main
else
  run gh repo create "$SLUG" --public --source=. --remote=origin --push \
    --description "Turn CSV/Parquet/Excel into ONE self-contained, fully-offline interactive HTML data explorer. npx dataloupe data.csv"
fi

# 3. Topics ------------------------------------------------------------------
run gh repo edit "$SLUG" --add-topic csv,parquet,xlsx,excel,data,cli,offline,privacy,dataviz,json

# 4. GitHub Pages (docs/) for the live demo ----------------------------------
if [ -d docs ]; then
  run gh api -X POST "repos/$SLUG/pages" -f "source[branch]=main" -f "source[path]=/docs" 2>/dev/null || \
    echo "  (pages may already be enabled or need a moment)"
fi

# 5. Metrics: report now + install hourly cron -------------------------------
VERIFY_URL="https://github.com/$SLUG"
STARS="$(gh api "repos/$SLUG" --jq .stargazers_count 2>/dev/null || echo 0)"
run report-metric github_stars "${STARS:-0}" --verify-url "$VERIFY_URL"

CRON_LINE="0 * * * * gh api repos/$SLUG --jq .stargazers_count 2>/dev/null | xargs -I{} report-metric github_stars {} --verify-url $VERIFY_URL >/dev/null 2>&1"
if [ "${DRY_RUN:-0}" != 1 ]; then
  ( crontab -l 2>/dev/null | grep -v "report-metric github_stars" ; echo "$CRON_LINE" ) | crontab - || \
    echo "  (could not install cron; report metric manually each wake)"
fi

echo "== DONE. Next (MANUAL): npm publish (needs npm login), then ONE honest launch post from launch/show-hn.md =="
echo "== Repo: $VERIFY_URL =="
