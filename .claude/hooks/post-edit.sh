#!/bin/bash

# Post-edit hook for TypeScript projects
# Runs typecheck, lint, and format after file changes

set -e

# Enable globstar for ** pattern matching (if available)
shopt -s globstar 2>/dev/null || true

# Get the project directory
PROJECT_DIR=$(pwd)

# Check if package.json exists (ensures we're in a Node.js project)
if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
  echo "⚠️  No package.json found, skipping post-edit checks"
  exit 0
fi

# Check if this is a TypeScript project
if [[ ! -f "$PROJECT_DIR/tsconfig.json" ]]; then
  echo "⚠️  No tsconfig.json found, skipping TypeScript checks"
  exit 0
fi

# Check if we should run checks based on recent git changes
# Only run if there are TypeScript, JavaScript, or config files changed
RELEVANT_FILES=$(git diff --name-only HEAD~1 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|json)$|tsconfig\.json|package\.json|\.eslintrc|\.prettierrc' || echo "")

# If no relevant files changed, skip (but still run for safety on first commit or when git diff fails)
if [[ -z "$RELEVANT_FILES" ]] && git rev-parse HEAD~1 >/dev/null 2>&1; then
  echo "ℹ️  No TypeScript/JavaScript files changed, skipping checks"
  exit 0
fi

# Find the nearest node_modules/.bin directory
NODE_MODULES_BIN=""
if [[ -d "$PROJECT_DIR/node_modules/.bin" ]]; then
  NODE_MODULES_BIN="$PROJECT_DIR/node_modules/.bin"
elif [[ -d "../node_modules/.bin" ]]; then
  NODE_MODULES_BIN="../node_modules/.bin"
elif [[ -d "../../node_modules/.bin" ]]; then
  NODE_MODULES_BIN="../../node_modules/.bin"
fi

echo "🔧 Running post-edit checks..."

# Run TypeScript typecheck
echo "📝 Running typecheck..."
TSC_CMD="tsc"
if [[ -n "$NODE_MODULES_BIN" && -f "$NODE_MODULES_BIN/tsc" ]]; then
  TSC_CMD="$NODE_MODULES_BIN/tsc"
elif ! command -v tsc &> /dev/null; then
  echo "⚠️  TypeScript compiler (tsc) not found, skipping typecheck"
  TSC_CMD=""
fi

if [[ -n "$TSC_CMD" ]]; then
  if $TSC_CMD --noEmit > /dev/null 2>&1; then
    echo "✅ Typecheck passed"
  else
    echo "❌ Typecheck failed"
    $TSC_CMD --noEmit
    exit 1
  fi
fi

# Run ESLint (with --fix)
echo "🧹 Running lint..."
ESLINT_CMD="eslint"
if [[ -n "$NODE_MODULES_BIN" && -f "$NODE_MODULES_BIN/eslint" ]]; then
  ESLINT_CMD="$NODE_MODULES_BIN/eslint"
elif ! command -v eslint &> /dev/null; then
  echo "⚠️  ESLint not found, skipping lint"
  ESLINT_CMD=""
fi

if [[ -n "$ESLINT_CMD" ]]; then
  if $ESLINT_CMD . --fix --ext .ts,.tsx,.js,.jsx > /dev/null 2>&1; then
    echo "✅ Lint passed"
  else
    echo "❌ Lint failed"
    $ESLINT_CMD . --fix --ext .ts,.tsx,.js,.jsx
    exit 1
  fi
fi

# Run Prettier
echo "💄 Running format..."
PRETTIER_CMD="prettier"
if [[ -n "$NODE_MODULES_BIN" && -f "$NODE_MODULES_BIN/prettier" ]]; then
  PRETTIER_CMD="$NODE_MODULES_BIN/prettier"
elif ! command -v prettier &> /dev/null; then
  echo "⚠️  Prettier not found, skipping format"
  PRETTIER_CMD=""
fi

if [[ -n "$PRETTIER_CMD" ]]; then
  if $PRETTIER_CMD --write "**/*.{ts,tsx,js,jsx,json,md}" > /dev/null 2>&1; then
    echo "✅ Format applied"
  else
    echo "❌ Format failed"
    $PRETTIER_CMD --write "**/*.{ts,tsx,js,jsx,json,md}"
    exit 1
  fi
fi

echo "✨ All post-edit checks completed successfully!"