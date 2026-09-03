#!/usr/bin/env bash
# 启用本机 Git hook：git push origin 时自动同步到 Gitee
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

chmod +x "$ROOT/.githooks/pre-push" "$ROOT/scripts/sync-to-gitee.sh"
git config core.hooksPath .githooks

if ! git remote get-url gitee >/dev/null 2>&1; then
  git remote add gitee git@gitee.com:moziinnovations/moziweb.git
fi

echo "✓ 已启用 Gitee 同步 hook（core.hooksPath=.githooks）"
echo "  之后 git push origin <branch> 会同时推送到 Gitee"
echo "  手动补同步: ./scripts/sync-to-gitee.sh"
