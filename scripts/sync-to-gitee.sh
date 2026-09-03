#!/usr/bin/env bash
# 把当前仓库同步到 Gitee（git@gitee.com:moziinnovations/moziweb.git）
#
# 用法:
#   ./scripts/sync-to-gitee.sh              # 推送当前分支
#   ./scripts/sync-to-gitee.sh --all        # 推送全部本地分支 + tags
#   ./scripts/sync-to-gitee.sh develop      # 推送指定分支
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GITEE_URL="${GITEE_URL:-git@gitee.com:moziinnovations/moziweb.git}"

if ! git remote get-url gitee >/dev/null 2>&1; then
  git remote add gitee "$GITEE_URL"
fi

push_ref() {
  local ref="$1"
  echo "→ gitee: $ref"
  git push gitee "$ref"
}

if [[ "${1:-}" == "--all" ]]; then
  git push gitee --all
  git push gitee --tags
  echo "✓ 已同步全部分支和 tags 到 Gitee"
  exit 0
fi

REF="${1:-$(git rev-parse --abbrev-ref HEAD)}"
if [[ "$REF" == "HEAD" ]]; then
  echo "当前处于 detached HEAD，请指定分支名" >&2
  exit 1
fi

push_ref "$REF"
echo "✓ 已同步 $REF 到 Gitee"
