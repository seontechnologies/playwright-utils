#!/bin/bash

# Post-edit hook for TypeScript projects
# Runs typecheck, lint, and format after file changes

set -e

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
fi

if $TSC_CMD --noEmit > /dev/null 2>&1; then
  echo "✅ Typecheck passed"
else
  echo "❌ Typecheck failed"
  $TSC_CMD --noEmit
  exit 1
fi

# Run ESLint (with --fix)
echo "🧹 Running lint..."
ESLINT_CMD="eslint"
if [[ -n "$NODE_MODULES_BIN" && -f "$NODE_MODULES_BIN/eslint" ]]; then
  ESLINT_CMD="$NODE_MODULES_BIN/eslint"
fi

if $ESLINT_CMD . --fix --ext .ts,.tsx,.js,.jsx > /dev/null 2>&1; then
  echo "✅ Lint passed"
else
  echo "❌ Lint failed"
  $ESLINT_CMD . --fix --ext .ts,.tsx,.js,.jsx
  exit 1
fi

# Run Prettier
echo "💄 Running format..."
PRETTIER_CMD="prettier"
if [[ -n "$NODE_MODULES_BIN" && -f "$NODE_MODULES_BIN/prettier" ]]; then
  PRETTIER_CMD="$NODE_MODULES_BIN/prettier"
fi

if $PRETTIER_CMD --write "**/*.{ts,tsx,js,jsx,json,md}" > /dev/null 2>&1; then
  echo "✅ Format applied"
else
  echo "❌ Format failed"
  $PRETTIER_CMD --write "**/*.{ts,tsx,js,jsx,json,md}"
  exit 1
fi

echo "✨ All post-edit checks completed successfully!"