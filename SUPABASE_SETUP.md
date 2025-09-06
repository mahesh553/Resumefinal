# Supabase Database Configuration

This document explains how to configure QoderResume with Supabase as the database provider.

## Configuration

The application has been configured to work with your Supabase database. The configuration supports both connection URL and individual parameter methods.

### Environment Variables

The following environment variables have been set in your `.env` file:

```bash
# Database Connection (Primary method)
DATABASE_URL="postgresql://postgres:tefzejmQnH4E1tgw@db.tehdaqxbvfgtqcjxrrzn.supabase.co:5432/postgres"

# Supabase Client Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tehdaqxbvfgtqcjxrrzn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Database Connection

The application uses TypeORM to connect to your Supabase PostgreSQL database. The configuration automatically:

- Uses SSL in production mode
- Supports both connection URL and individual parameters
- Enables synchronization in development mode
- Handles automatic schema migrations

### Supabase Client

A Supabase client has been configured in `src/frontend/lib/supabase.ts` with:

- **Public client**: For frontend operations with RLS (Row Level Security)
- **Admin client**: For server-side operations with service role key

### Usage

#### Backend (NestJS/TypeORM)

The backend automatically connects using the configuration in `app.module.ts`. No additional setup required.

#### Frontend (Next.js)

Import and use the Supabase client:

```typescript
import { supabase, supabaseAdmin } from "@/lib/supabase";

// Client-side operations
const { data, error } = await supabase.from("table_name").select("*");

// Server-side operations (API routes)
const { data, error } = await supabaseAdmin.from("table_name").select("*");
```

### Security Notes

- The service role key should only be used server-side
- RLS policies should be configured in Supabase for data security
- The anon key is safe to use in client-side code
- All sensitive keys are in `.env` which is git-ignored

### Database Schema

The application will automatically create the necessary tables using TypeORM migrations and entity definitions located in `src/backend/database/entities/`.

## Next Steps

1. **Run the application**: `npm run dev`
2. **Verify connection**: Check the console for successful database connection
3. **Set up RLS policies**: Configure Row Level Security in your Supabase dashboard
4. **Add AI API keys**: Configure your AI provider keys in the `.env` file
5. **Configure authentication**: Set up OAuth providers if needed

## Troubleshooting

If you encounter connection issues:

1. Verify the DATABASE_URL is correct
2. Check that your Supabase project is active
3. Ensure SSL certificates are properly handled
4. Check the application logs for specific error messages

The configuration supports fallback to individual connection parameters if the URL method fails.
