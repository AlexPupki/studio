
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
- To seed the database with initial data (e.g., admin user), run:
  ```bash
  npm run db:seed
  ```

## CORS

The Next.js application is configured with wide-open CORS headers for development purposes in `next.config.ts`.
A `cors.json` file is also provided for configuring Google Cloud services like Cloud Storage.

To apply this CORS configuration to your GCS bucket, you can use the `gcloud` CLI:
```bash
# Make sure you have the gcloud CLI installed and are authenticated.
# Replace [YOUR_BUCKET_NAME] with your actual GCS bucket name (e.g., gs://grandtoursochi)
gcloud storage buckets update gs://[YOUR_BUCKET_NAME] --cors-file=./cors.json
```

## Deploy

This project is configured for deployment on Firebase App Hosting.

### 1. Set up secrets

For production, it is crucial to store your environment variables securely in a secret manager like Google Secret Manager. Below is an example of how to set up the most critical secrets.

```bash
# Replace [YOUR_PROJECT_ID] with your Google Cloud project ID

# Database Credentials
gcloud secrets create "PG_HOST" --project="[YOUR_PROJECT_ID]"
gcloud secrets versions add "PG_HOST" --project="[YOUR_PROJECT_ID]" --data-file=- <<< "your-db-host"

gcloud secrets create "PG_USER" --project="[YOUR_PROJECT_ID]"
gcloud secrets versions add "PG_USER" --project="[YOUR_PROJECT_ID]" --data-file=- <<< "your-db-user"

gcloud secrets create "PG_PASSWORD" --project="[YOUR_PROJECT_ID]"
gcloud secrets versions add "PG_PASSWORD" --project="[YOUR_PROJECT_ID]" --data-file=- <<< "your-db-password"

gcloud secrets create "PG_DATABASE" --project="[YOUR_PROJECT_ID]"
gcloud secrets versions add "PG_DATABASE" --project="[YOUR_PROJECT_ID]" --data-file=- <<< "your-db-name"


# Session Secret Key (generate a long random string)
gcloud secrets create "SESSION_SECRET_KEY" --project="[YOUR_PROJECT_ID]"
gcloud secrets versions add "SESSION_SECRET_KEY" --project="[YOUR_PROJECT_ID]" --data-file=- <<< "your_super_secret_session_key_32_chars_long"

# Gemini API Key
gcloud secrets create "GEMINI_API_KEY" --project="[YOUR_PROJECT_ID]"
gcloud secrets versions add "GEMINI_API_KEY" --project="[YOUR_PROJECT_ID]" --data-file=- <<< "your_gemini_api_key"

# GCS Bucket Name
gcloud secrets create "GCS_BUCKET" --project="[YOUR_PROJECT_ID]"
gcloud secrets versions add "GCS_BUCKET" --project="[YOUR_PROJECT_ID]" --data-file=- <<< "your-gcs-bucket-name"

# Grant the App Hosting service account access to the secrets
# You can find the service account email in the Google Cloud console under IAM.
# It usually looks like service-p-[YOUR_PROJECT_ID]@gcp-sa-apphosting.iam.gserviceaccount.com
SERVICE_ACCOUNT_EMAIL="service-p-[YOUR_PROJECT_ID]@gcp-sa-apphosting.iam.gserviceaccount.com"

gcloud secrets add-iam-policy-binding "PG_HOST" \
    --project="[YOUR_PROJECT_ID]" \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/secretmanager.secretAccessor"

# Repeat the binding for each secret: PG_USER, PG_PASSWORD, PG_DATABASE, SESSION_SECRET_KEY, GEMINI_API_KEY, GCS_BUCKET etc.
```

### 2. Deploy

```bash
firebase deploy --only hosting
```
