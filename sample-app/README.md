# Sample App

## Overview

This is a mid-sized Express/TypeScript app designed to test various Playwright utilities:

- `apiRequest` - For API testing and request automation
- `recurse` - For eventual consistency and retry patterns
- `authSession` - For authentication management

The app includes a proper local database, Kafka event publishing, and file-based event logging to create a realistic testing environment.

## Development & Testing Architecture

This sample app is a workspace within the main monorepo. It:

- Reuses core utilities from the root project
- Adds app-specific dependencies in its own package.json
- Provides realistic scenarios for testing Playwright utilities

## Running the App

### Starting the App

1. Start Docker (required for Kafka)
2. From the root directory, run:

   ```bash
   npm run start:sample-app

   # or in this directory
   npm start
   ```

The startup scripts include built-in verification for eventual consistency, Kafka health checks, and database preparation.

### Testing with REST Client

You can test the API endpoints using the REST client file:

```plaintext
sample-app/test.http
```

### Available Scripts

#### Database Management

> `npm start` in this directory / `npm run start:sample-app` handles all this.

If you have to manually reset the db:

```bash
npm run db:migrate
npm run db:sync    # Sync database schema
npm run reset:db    # Reset database to initial state
```

#### Kafka Management

```bash
npm run kafka:start       # Start Kafka containers
npm run kafka:stop        # Stop Kafka containers
npm run kafka:reset-logs  # Clear event logs
```
