# Sample app

To test `apiRequest`, `recurse` and `authSession`.

## Setup

```bash
npm i
```

Use the sample `.env.example` file to create a `.env` file of your own. These values will also have to exist in your CI secrets.

```bash
PORT=3001
```

### Scripts

```bash
npm run lint
npm run typecheck
npm run fix:format
npm run validate # all the above in parallel

npm run test # unit tests
npm run test:watch # watch mode
```

If you have to manually reset the db:

```bash
npm run db:migrate
npm run db:sync
npm run reset:db
```
