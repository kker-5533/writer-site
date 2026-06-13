#!/bin/bash
# ============================================================================
# Stop Hook: 交付验收检查
# ============================================================================
# 规则：如果本轮修改了代码/配置/文档，但没有完成验证，阻止结束。
# 如果已经完成验证（或本轮没有修改），允许结束。
# ============================================================================

# --- 配置 ---------------------------------------------------------------
MARKER_FILE=".claude/.verification_done"

# 源码/配置/文档扩展名（用于 git diff 过滤 和 find 搜索）
CODE_EXTS="ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|rb|php|c|cpp|h|hpp|css|scss|less|html|vue|svelte|astro|json|ya?ml|toml|md|mdx|rst|sql|graphql|proto|tf|sh|bash|zsh"
CONFIG_GLOB="Dockerfile|Makefile|CMakeLists|\.env|docker-compose|\.cfg$|\.ini$|\.conf$|\.config$|\.prisma$|\.kdl$|\.tfvars$"

# --- 颜色 ---------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# --- 检查是否有代码/配置/文档修改 --------------------------------------
has_modifications() {
  # 方法 A: Git 仓库 → 检查 git diff
  if git rev-parse --git-dir >/dev/null 2>&1; then
    local changes
    changes=$(git diff --name-only HEAD 2>/dev/null || true)
    changes+=$(git diff --name-only --cached 2>/dev/null || true)
    changes+=$(git ls-files --others --exclude-standard 2>/dev/null || true)

    local relevant
    relevant=$(echo "$changes" | grep -iE "\.(${CODE_EXTS})$|(${CONFIG_GLOB})" 2>/dev/null | grep -v 'node_modules/\|\.git/\|\.claude/\|dist/\|build/' | head -20)
    [ -n "$relevant" ] && return 0
    return 1
  fi

  # 方法 B: 非 Git → 查找最近 24 小时内修改的源码文件
  local found
  found=$(find . -type f \
    \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
    -o -name "*.mjs" -o -name "*.cjs" \
    -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" \
    -o -name "*.rb" -o -name "*.php" -o -name "*.c" -o -name "*.cpp" \
    -o -name "*.h" -o -name "*.hpp" \
    -o -name "*.css" -o -name "*.scss" -o -name "*.less" \
    -o -name "*.html" -o -name "*.vue" -o -name "*.svelte" -o -name "*.astro" \
    -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" \
    -o -name "*.md" -o -name "*.mdx" -o -name "*.rst" \
    -o -name "*.sql" -o -name "*.graphql" -o -name "*.proto" -o -name "*.tf" \
    -o -name "*.sh" -o -name "*.bash" -o -name "*.zsh" \
    -o -name "Dockerfile" -o -name "Makefile" -o -name "CMakeLists.txt" \
    -o -name "*.cmake" -o -name ".env*" -o -name "*.cfg" -o -name "*.ini" \
    -o -name "*.conf" -o -name "*.config" -o -name "docker-compose*.yml" \
    -o -name "docker-compose*.yaml" -o -name "*.tfvars" \
    -o -name "*.prisma" -o -name "*.kdl" \) \
    -not -path "./.claude/*" \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./target/*" \
    -not -path "./dist/*" \
    -not -path "./build/*" \
    -not -path "./__pycache__/*" \
    -not -path "./.venv/*" \
    -not -path "./vendor/*" \
    -not -path "./.next/*" \
    -not -path "./.nuxt/*" \
    -not -path "./.cache/*" \
    -not -path "./.turbo/*" \
    -not -path "./coverage/*" \
    -not -path "./.nyc_output/*" \
    -mmin -1440 \
    2>/dev/null | head -20 || true)

  [ -n "$found" ] && return 0
  return 1
}

# --- 检查验证是否完成 --------------------------------------------------
is_verified() {
  if [ -f "$MARKER_FILE" ]; then
    # 检查标记文件是否在 24 小时内创建（避免跨会话残留）
    local marker_time now age_hours
    marker_time=$(stat -f "%m" "$MARKER_FILE" 2>/dev/null || stat -c "%Y" "$MARKER_FILE" 2>/dev/null || echo "0")
    now=$(date +%s)
    age_hours=$(( (now - marker_time) / 3600 ))
    [ "$age_hours" -lt 24 ] && return 0
  fi
  return 1
}

# --- 显示验证标记内容 --------------------------------------------------
show_marker() {
  if [ -f "$MARKER_FILE" ]; then
    echo -e "  ${CYAN}验证标记:${NC}"
    cat "$MARKER_FILE" 2>/dev/null | while IFS= read -r line; do
      echo "    $line"
    done
  fi
}

# --- 主逻辑 ------------------------------------------------------------
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  🔍 交付验收检查  (Stop Hook)${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! has_modifications; then
  echo -e "  ${GREEN}✅ 本轮未修改代码/配置/文档 — 允许结束${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  rm -f "$MARKER_FILE"
  exit 0
fi

echo -e "  ${YELLOW}⚠️  检测到代码/配置/文档修改${NC}"
echo ""

if is_verified; then
  echo -e "  ${GREEN}✅ 验证已完成 — 允许结束${NC}"
  show_marker
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  rm -f "$MARKER_FILE"
  exit 0
fi

# --- 阻止结束 ----------------------------------------------------------
echo -e "  ${RED}${BOLD}❌ 验证未完成 — 阻止结束！${NC}"
echo ""
echo -e "  ${YELLOW}请 Claude 完成以下验证后再结束：${NC}"
echo -e "  ${CYAN}  1. 测试 (tests)        — npm test / pytest / go test / cargo test${NC}"
echo -e "  ${CYAN}  2. 代码检查 (lint)     — npm run lint / eslint / ruff${NC}"
echo -e "  ${CYAN}  3. 类型检查 (typecheck) — tsc --noEmit / mypy / cargo check${NC}"
echo -e "  ${CYAN}  4. 功能验证 (functional)— 确认改动达到预期效果${NC}"
echo -e "  ${CYAN}  5. TODO 检查           — 无遗留 TODO/FIXME/HACK${NC}"
echo ""
echo -e "  ${GREEN}📝 完成验证后，执行以下命令标记完成：${NC}"
echo -e "  ${GREEN}   python3 .claude/hooks/mark-verified.py all${NC}"
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
exit 1
