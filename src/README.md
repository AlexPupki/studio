# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## DB

This project uses Drizzle ORM to manage the database schema.

- To generate a new migration based on schema changes in `src/lib/server/db/schema.ts`, run:
  ```bash
  npm run db:generate
  ```
- To apply pending migrations to the database, run:
  ```bash
  npm run db:migrate
  ```

## Cron Jobs

This project includes a cron job to handle expired booking holds.

### Setup Cloud Scheduler

1. Go to the Google Cloud Console and create a new Cloud Scheduler job.
2. Configure the job with the following settings:
   - **Frequency:** `*/5 * * * *` (runs every 5 minutes)
   - **Target type:** HTTP
   - **URL:** `[YOUR_APP_URL]/api/jobs/holds/expire`
   - **HTTP method:** POST
   - **Headers:** Add a header `Authorization` with the value `Bearer [YOUR_CRON_SECRET]`.
     - The `CRON_SECRET` must match the value you set in Secret Manager.
   - **Auth header:** `OIDC token` (Recommended for production)
     - **Service account:** The App Hosting service account.

## Deploy

This project is configured for deployment on Firebase App Hosting.

**IMPORTANT:** The production environment for this stage has limitations. It does **not** include advanced SEO, multi-locale routing, or observability stacks like Sentry/OTEL.

### 1. Set up secrets

Store your production environment variables in Google Secret Manager.

```bash
# Replace [YOUR_PROJECT_ID] with your Google Cloud project ID
gcloud secrets create "DATABASE_URL" --project="[YOUR_PROJECT_ID]"
gcloud secrets versions add "DATABASE_URL" --project="[YOUR_PROJECT_ID]" --data-file=- <<< "postgres://user:pass@host:port/db"

gcloud secrets create "REDIS_URL" --project="[YOUR_PROJECT_ID]"
gcloud secrets versions add "REDIS_URL" --project="[YOUR_PROJECT_ID]" --data-file=- <<< "redis://..."

gcloud secrets create "JWT_SECRET" --project="[YOUR_PROJECT_ID]"
gcloud secrets versions add "JWT_SECRET" --project="[YOUR_PROJECT_ID]" --data-file=- <<< "your_super_secret_jwt_string"

gcloud secrets create "CRON_SECRET" --project="[YOUR_PROJECT_ID]"
gcloud secrets versions add "CRON_SECRET" --project="[YOUR_PROJECT_ID]" --data-file=- <<< "your_super_secret_cron_string"


# Grant the App Hosting service account access to the secrets
# You can find the service account email in the Google Cloud console
gcloud secrets add-iam-policy-binding "DATABASE_URL" \
    --project="[YOUR_PROJECT_ID]" \
    --member="serviceAccount:service-p-[YOUR_PROJECT_ID]@gcp-sa-apphosting.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Repeat for REDIS_URL, JWT_SECRET, and CRON_SECRET
```

### 2. Deploy

```bash
firebase deploy --only hosting
```
