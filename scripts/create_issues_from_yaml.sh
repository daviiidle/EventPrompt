#!/usr/bin/env bash
set -euo pipefail

YAML_PATH=${1:-.github/issue-import/issues.yaml}

if [[ ! -f "$YAML_PATH" ]]; then
  echo "YAML file not found: $YAML_PATH" >&2
  exit 1
fi

parse_yaml() {
  python3 - "$YAML_PATH" <<'PY'
import base64
import sys

path = sys.argv[1]

with open(path, "r", encoding="utf-8") as f:
    lines = f.read().splitlines()

repo = None
issues = []
current = None
state = None
body_lines = []

i = 0
while i < len(lines):
    line = lines[i]

    if state == "body":
        if line.startswith("      "):
            body_lines.append(line[6:])
            i += 1
            continue
        current["body"] = "\n".join(body_lines).rstrip("\n")
        body_lines = []
        state = None
        continue

    if line.startswith("repo:"):
        repo_value = line.split(":", 1)[1].strip()
        if repo_value.startswith("\"") and repo_value.endswith("\""):
            repo_value = repo_value[1:-1]
        repo = repo_value
        i += 1
        continue

    if line.startswith("  - title:"):
        if current:
            issues.append(current)
        title_value = line.split(":", 1)[1].strip()
        if title_value.startswith("\"") and title_value.endswith("\""):
            title_value = title_value[1:-1]
        current = {"title": title_value, "labels": [], "body": ""}
        state = None
        i += 1
        continue

    if line.startswith("    labels:"):
        state = "labels"
        i += 1
        continue

    if state == "labels" and line.startswith("      - "):
        label = line[len("      - "):].strip()
        current["labels"].append(label)
        i += 1
        continue

    if line.startswith("    body: |"):
        state = "body"
        body_lines = []
        i += 1
        continue

    i += 1

if state == "body" and current is not None:
    current["body"] = "\n".join(body_lines).rstrip("\n")

if current:
    issues.append(current)

if not repo:
    print("ERROR\tMissing repo in YAML", file=sys.stderr)
    sys.exit(2)

print(f"REPO\t{repo}")
for issue in issues:
    title_b64 = base64.b64encode(issue["title"].encode("utf-8")).decode("ascii")
    labels_csv = ",".join(issue["labels"])
    labels_b64 = base64.b64encode(labels_csv.encode("utf-8")).decode("ascii")
    body_b64 = base64.b64encode(issue["body"].encode("utf-8")).decode("ascii")
    print(f"ISSUE\t{title_b64}\t{labels_b64}\t{body_b64}")
PY
}

repo=""
while IFS=$'\t' read -r record a b c; do
  if [[ "$record" == "REPO" ]]; then
    repo="$a"
  fi
  if [[ "$record" == "ISSUE" ]]; then
    title=$(printf '%s' "$a" | base64 -d)
    labels=$(printf '%s' "$b" | base64 -d)
    body=$(printf '%s' "$c" | base64 -d)

    if [[ "$repo" == "<OWNER>/<REPO>" ]]; then
      echo "Repo placeholder is still set in $YAML_PATH" >&2
      exit 1
    fi

    exists=$(gh issue list --repo "$repo" --search "in:title \"$title\"" --json title --limit 200 | \
      python3 - <<'PY'
import json
import sys

items = json.load(sys.stdin)
query = sys.argv[1]
for item in items:
    if item.get("title") == query:
        print("yes")
        sys.exit(0)
print("no")
PY
"$title")

    if [[ "$exists" == "yes" ]]; then
      echo "Skipping existing issue: $title"
      continue
    fi

    if [[ -n "$labels" ]]; then
      gh issue create --repo "$repo" --title "$title" --body "$body" --label "$labels"
    else
      gh issue create --repo "$repo" --title "$title" --body "$body"
    fi
  fi
done < <(parse_yaml)
