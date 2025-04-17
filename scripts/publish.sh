#!/bin/bash
set -e # fail on script error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if on main or master branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
  echo -e "${YELLOW}Warning: You are not on the main or master branch.${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborting.${NC}"
    exit 1
  fi
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: Working directory is not clean. Commit or stash changes first.${NC}"
  exit 1
fi

# Check for required .npmrc configuration
if [ ! -f .npmrc ] || ! grep -q "npm.pkg.github.com" .npmrc; then
  echo -e "${RED}Error: Missing .npmrc file or incorrect configuration.${NC}"
  echo -e "Please create an .npmrc file with the following example content:"
  echo -e "public registry example:"
  echo -e "@seontechnologies:registry=https://npm.pkg.github.com"
  echo -e "//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}"
  echo -e "public example"
  echo -e "registry=https://registry.npmjs.org"
  exit 1
fi

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
  echo -e "${RED}Error: GITHUB_TOKEN environment variable is not set.${NC}"
  echo -e "Please set it with: export GITHUB_TOKEN=your_github_token"
  exit 1
fi

# Read current version
CURRENT_VERSION=$(npm pkg get version | tr -d '"')
echo -e "Current version: ${GREEN}$CURRENT_VERSION${NC}"

# Prompt for version type or specific version
echo "Select version type:"
echo "1) Patch (x.x.X)"
echo "2) Minor (x.X.0)"
echo "3) Major (X.0.0)"
echo "4) Custom version"
echo "5) Use date-based version (YYYY.MM.DD-commit)"
read -p "Enter choice (1-5): " VERSION_CHOICE

case $VERSION_CHOICE in
  1) VERSION_TYPE="patch" ;;
  2) VERSION_TYPE="minor" ;;
  3) VERSION_TYPE="major" ;;
  4)
    read -p "Enter custom version (without v prefix): " CUSTOM_VERSION
    VERSION_TYPE=$CUSTOM_VERSION
    ;;
  5)
    # Parse current version to understand current semver positioning
    IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
    PATCH_BASE="${PATCH%%-*}" # Remove anything after a dash
    
    echo "Choose semver version type:"
    echo "a) Patch: $MAJOR.$MINOR.$((PATCH_BASE + 1))"
    echo "b) Minor: $MAJOR.$((MINOR + 1)).0"
    echo "c) Major: $((MAJOR + 1)).0.0"
    read -p "Enter choice (a-c): " SEM_VERSION_CHOICE
    
    case $SEM_VERSION_CHOICE in
      a|A) VERSION_TYPE="$MAJOR.$MINOR.$((PATCH_BASE + 1))" ;;
      b|B) VERSION_TYPE="$MAJOR.$((MINOR + 1)).0" ;;
      c|C) VERSION_TYPE="$((MAJOR + 1)).0.0" ;;
      *)
        echo -e "${RED}Invalid choice. Using patch version.${NC}"
        VERSION_TYPE="$MAJOR.$MINOR.$((PATCH_BASE + 1))"
        ;;
    esac
    ;;
  *)
    echo -e "${RED}Invalid choice. Exiting.${NC}"
    exit 1
    ;;
esac

# Build the package
echo -e "${YELLOW}Building package...${NC}"
npm run build

# Bump version
if [[ "$VERSION_CHOICE" == "4" || "$VERSION_CHOICE" == "5" ]]; then
  echo -e "Setting version to: ${GREEN}$VERSION_TYPE${NC}"
  npm version "$VERSION_TYPE" --no-git-tag-version
else
  echo -e "Bumping ${GREEN}$VERSION_TYPE${NC} version..."
  npm version $VERSION_TYPE --no-git-tag-version
fi

NEW_VERSION=$(npm pkg get version | tr -d '"')

# Publish
echo -e "${YELLOW}Publishing version ${GREEN}$NEW_VERSION${NC} to GitHub Packages..."
npm publish

echo -e "${GREEN}Successfully published version $NEW_VERSION${NC}"

# Create a version commit and tag
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release $NEW_VERSION"

echo -e "${YELLOW}Push commit and tag? (y/N)${NC}"
read -p "" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git push origin $CURRENT_BRANCH
  git push origin "v$NEW_VERSION"
  echo -e "${GREEN}Pushed commit and tag v$NEW_VERSION${NC}"
else
  echo -e "${YELLOW}Skipped pushing. Remember to push manually:${NC}"
  echo "  git push origin $CURRENT_BRANCH"
  echo "  git push origin v$NEW_VERSION"
fi