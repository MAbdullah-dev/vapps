import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
    // optionally shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
  /* you can add migrations/seed config here if needed */
});
