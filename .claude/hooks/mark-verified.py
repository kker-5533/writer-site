#!/usr/bin/env python3
"""
标记验证完成。

用法:
  python3 .claude/hooks/mark-verified.py all        # 标记全部完成 → 允许结束
  python3 .claude/hooks/mark-verified.py tests       # 标记测试完成
  python3 .claude/hooks/mark-verified.py lint         # 标记 lint 完成
  python3 .claude/hooks/mark-verified.py typecheck    # 标记类型检查完成
  python3 .claude/hooks/mark-verified.py functional   # 标记功能验证完成
  python3 .claude/hooks/mark-verified.py todos        # 标记 TODO 检查完成
  python3 .claude/hooks/mark-verified.py status       # 查看当前状态
"""
import json, sys, os
from datetime import datetime, timezone

MARKER_FILE = ".claude/.verification_done"

MAPPING = {
    "tests": "tests",
    "lint": "lint",
    "typecheck": "typecheck",
    "functional": "functional",
    "todos": "todos_checked",
}

ICONS = {
    "tests": "🧪",
    "lint": "🔍",
    "typecheck": "🦺",
    "functional": "✅",
    "todos_checked": "📋",
}

LABELS = {
    "tests": "测试",
    "lint": "代码检查",
    "typecheck": "类型检查",
    "functional": "功能验证",
    "todos_checked": "TODO检查",
}


def load():
    if os.path.exists(MARKER_FILE):
        with open(MARKER_FILE) as f:
            return json.load(f)
    return {
        "tests": False,
        "lint": False,
        "typecheck": False,
        "functional": False,
        "todos_checked": False,
        "done": False,
    }


def save(data):
    os.makedirs(os.path.dirname(MARKER_FILE), exist_ok=True)
    with open(MARKER_FILE, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def show_status(data):
    print()
    print("📊 验证状态")
    print("───────────")
    all_ok = True
    for key, label in LABELS.items():
        ok = data.get(key, False)
        icon = "✅" if ok else "❌"
        print(f"  {icon}  {label}")
        if not ok:
            all_ok = False
    print()
    if data.get("done"):
        completed = data.get("completed_at", "未知时间")
        print(f"🏁 全部验证完成 (@ {completed})")
    elif all_ok:
        print("⚠️  分项全完成但未标记 'done'，请执行:")
        print("   python3 .claude/hooks/mark-verified.py all")
    else:
        remaining = [k for k in MAPPING.values() if not data.get(k)]
        print(f"⏳ 待完成: {', '.join(remaining)}")
    print()


def main():
    if len(sys.argv) < 2:
        print("用法: python3 .claude/hooks/mark-verified.py <tests|lint|typecheck|functional|todos|all|status>")
        sys.exit(1)

    key = sys.argv[1].lower()
    data = load()

    if key == "status":
        show_status(data)
        return

    if key == "all":
        for k in MAPPING.values():
            data[k] = True
        data["done"] = True
        data["completed_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        save(data)
        print()
        print("🎉 全部验证项已标记为完成！")
        print("   现在可以安全结束会话。")
        print()
        return

    if key in MAPPING:
        internal_key = MAPPING[key]
        data[internal_key] = True
        icon = ICONS.get(internal_key, "✅")
        label = LABELS.get(internal_key, key)

        # 检查是否所有分项都完成了
        all_done = all(data.get(k) for k in MAPPING.values())
        if all_done:
            data["done"] = True
            data["completed_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        save(data)
        print(f"{icon} 已标记: {label} 完成" + ("  🏁 全部完成！" if all_done else ""))
        if not all_done:
            remaining = [LABELS[k] for k in MAPPING.values() if not data.get(k)]
            print(f"   剩余: {', '.join(remaining)}")
        return

    print(f"❌ 未知验证项: {key}")
    print(f"   可用: tests, lint, typecheck, functional, todos, all, status")
    sys.exit(1)


if __name__ == "__main__":
    main()
