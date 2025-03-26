## Setup for this repo

```bash
npm i
```

```bash
npm run lint
npm run typecheck
npm run fix:format
npm run validate # all the above in parallel

npm run test # unit tests
npm run test:watch # watch mode

npm run mock:server # starts the mock backend/provider server

npm run cy:open-local # open mode
npm run cy:run-local  # run mode
npm run cy:run-local-fast  # no video or screen shots
```

## Test the package locally

```bash
npm pack
# copy the tar file to the target repo root
npm install playwright-utils-1.0.0.tgz
```

## Release

```bash
# Switch to main branch and update

# Create an annotated tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push the annotated tag to GitHub
git push origin v1.0.0
# Alternatively, push all tags
git push --tags
```

## Publish (auto)

Done automatically via github actions on tag push.

> Publish manually
>
> ```bash
> npm login
> # enter creds
>
> npm publish
>
> # Note: If your package name is scoped
> #(e.g., @yourusername/retryable-before), you might need to publish it as public:
> npm publish --access public
> ```
