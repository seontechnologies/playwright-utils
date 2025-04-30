import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query']
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Prisma notes
/*
To connect our applications to a database, we often use an Object-relational
Mapper (ORM). An ORM is a tool that sits between a database and an application.
It’s responsible for mapping database records to objects in an application.
Prisma is the most widely-used ORM for Next.js (or Node.js) applications.

1. **Define Models**: To use Prisma, first we have to define our data models.
   These are entities that represent our application domain, such as User,
   Order, Customer, etc. Each model has one or more fields (or properties).

 `npx prisma init` , and then at `./prisma/schema.prisma` create your models.

> We want to match these with our Zod types, ex: `./app/api/users/schema.ts`, `./app/api/products/schema.ts`

2. **Create migration file**: Once we create a model, we use Prisma CLI to
   create a migration file. A migration file contains instructions to generate
   or update database tables to match our models. These instructions are in SQL
   language, which is the language database engines understand.

 `npx prisma migrate dev`

3. **Create a Prisma client**: To connect with a database, we create an instance
   of PrismaClient. This client object gets automatically generated whenever we
   create a new migration. It exposes properties that represent our models (eg
   user).

 At `./prisma/client.ts` copy paste this code

```ts
import {PrismaClient} from '@prisma/client'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
*/
