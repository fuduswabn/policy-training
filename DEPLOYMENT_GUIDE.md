# Deployment Guide

## Pre-Deployment Checklist

- [ ] Test all authentication flows
- [ ] Verify policy upload works
- [ ] Test quiz creation and taking
- [ ] Check compliance report generation
- [ ] Review admin dashboard functionality
- [ ] Test on iOS simulator
- [ ] Test on Android emulator

## Deployment Steps

### 1. Configure Environment

Add to `.a0/general.yaml`:
```yaml
name: "Policy Training System"
description: "Corporate compliance and training platform"
```

### 2. Deploy to Production

1. Click **Deploy** button in top-right
2. Wait for Convex backend to sync
3. Mobile app auto-deploys to managed runtime

### 3. Post-Deployment

1. Test in production environment
2. Set up test accounts
3. Run through complete workflows
4. Monitor logs in `.a0/logs/`

## Scaling Considerations

### Database
- Convex automatically scales
- Monitor request usage
- Implement pagination for large datasets

### AI Requests
- Rate limit LLM API calls
- Cache policy chunks to reduce calls
- Batch quiz generation during off-hours

### Users
- Current schema supports 1000+ employees
- For 10k+ users, consider denormalization
- Archive old quiz attempts regularly

## Monitoring

Check logs in `.a0/logs/`:
- `convex/` - Backend function errors
- `runtime/` - App runtime issues

## Supabase Backup and Disaster Recovery

### Current review findings

- `SUPABASE_SETUP.sql` currently defines three database tables: `email_logs`, `user_presence`, and `notifications`.
- RLS is enabled, but the current policies allow all operations with `USING (true)`. This is acceptable only for early testing. Before real taxi-rank data is entered, replace these with user/org/role-scoped policies.
- No Supabase Storage buckets or Storage access policies are defined in this repository. The backup workflow inventories every live bucket through the Supabase Storage API so the real bucket list is captured in each storage backup.
- Sensitive-looking Firebase JSON asset links were removed from tracked assets. Production secrets, database dumps, encrypted archives, and restore-test outputs are now ignored by `.gitignore`.

### What is backed up

| Area | Backup contents | Frequency | Retention | Location |
| --- | --- | --- | --- | --- |
| Supabase Postgres | Full custom-format `pg_dump`, schema-only SQL, `pg_restore --list` manifest, SHA-256 checksum | Daily at 03:15 UTC and manual GitHub Actions run | Default 35 days | Independent S3/S3-compatible bucket under `supabase-production/db/YYYY/MM/DD/TIMESTAMP/` |
| Supabase Storage | All buckets by default, bucket metadata, object inventory, object files, object SHA-256 hashes | Daily with the same workflow | Default 90 days | Independent S3/S3-compatible bucket under `supabase-production/storage/YYYY/MM/DD/TIMESTAMP/` |
| Important uploaded files | Included in the Storage backup. Use `BACKUP_STORAGE_BUCKET_ALLOWLIST` if only production-critical buckets should be backed up. | Daily | Default 90 days | Same independent backup bucket |

Backups are encrypted with GPG before upload and uploaded with S3 server-side encryption. No backup payloads or credentials are stored in GitHub.

### Required GitHub secrets

Add these in GitHub repository settings before the first live rank starts entering production data:

- `SUPABASE_DB_URL`: Supabase production Postgres connection string. Use the pooler/direct connection string with a database password.
- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Service-role key used only inside GitHub Actions to inventory/download Storage.
- `BACKUP_GPG_PASSPHRASE`: strong passphrase stored outside GitHub as well, for example in your password manager.
- `BACKUP_S3_BUCKET`: independent backup bucket name, not Supabase Storage.
- `BACKUP_AWS_ACCESS_KEY_ID` and `BACKUP_AWS_SECRET_ACCESS_KEY`: least-privilege credentials that can write/read the backup bucket and manage lifecycle if enabled.
- `BACKUP_AWS_REGION`: backup bucket region.
- `BACKUP_S3_ENDPOINT_URL`: optional; set for Backblaze B2, Cloudflare R2, Wasabi, or another S3-compatible provider.
- `BACKUP_ALERT_WEBHOOK_URL`: Slack/Teams/Discord/webhook endpoint for failure alerts.

Optional GitHub variables:

- `BACKUP_PREFIX`: default `supabase-production`.
- `BACKUP_DB_RETENTION_DAYS`: default `35`.
- `BACKUP_STORAGE_RETENTION_DAYS`: default `90`.
- `BACKUP_STORAGE_BUCKET_ALLOWLIST`: comma-separated bucket IDs/names if only selected buckets should be backed up.
- `APPLY_BACKUP_LIFECYCLE`: set to `true` only after confirming the bucket lifecycle policy should be managed by this workflow.

### Automation and verification

The workflow `.github/workflows/supabase-backup.yml` runs daily and can also be run manually. It:

1. Dumps the production database using `pg_dump --format=custom`.
2. Creates a schema-only SQL export.
3. Verifies the dump can be read with `pg_restore --list`.
4. Performs a restore smoke test into a disposable PostgreSQL service during the GitHub Actions run.
5. Inventories and downloads Supabase Storage buckets using the service-role key.
6. Encrypts database and storage backup files with GPG.
7. Uploads encrypted files and checksums to the independent S3/S3-compatible backup bucket.
8. Sends a webhook alert if the workflow fails.

A successful workflow run is the required test restore before launch. Run it manually once, confirm the database restore smoke test passes, and confirm backup objects exist in the independent bucket.

### Restore procedure: database

1. Freeze writes to the app if possible.
2. Identify the backup timestamp to restore from in the independent backup bucket.
3. Download `postgres.dump.gpg` and `postgres.dump.gpg.sha256`.
4. Verify integrity:
   ```sh
   sha256sum -c postgres.dump.gpg.sha256
   ```
5. Decrypt locally or in a secure recovery environment:
   ```sh
   gpg --decrypt postgres.dump.gpg > postgres.dump
   ```
6. Restore to a new Supabase project or a verified recovery database first:
   ```sh
   pg_restore --clean --if-exists --no-owner --no-acl --exit-on-error \
     --dbname "$RECOVERY_DATABASE_URL" postgres.dump
   ```
7. Run application smoke tests against the recovery database.
8. If production was lost, either promote the recovered Supabase project or restore into production during a maintenance window.
9. Rotate any exposed credentials and update app/environment configuration if the Supabase project URL changed.

### Restore procedure: Storage

1. Download `storage.tar.gz.gpg` and `storage.tar.gz.gpg.sha256` for the matching timestamp.
2. Verify and decrypt:
   ```sh
   sha256sum -c storage.tar.gz.gpg.sha256
   gpg --decrypt storage.tar.gz.gpg > storage.tar.gz
   tar -xzf storage.tar.gz
   ```
3. Review `storage/storage-inventory.json` for bucket names, public/private status, file-size limits, MIME limits, object paths, and checksums.
4. Recreate missing buckets in Supabase with the same public/private settings and limits.
5. Upload files from `storage/objects/<bucket-name>/...` back to the matching buckets using the Supabase dashboard, CLI, or a temporary service-role restore script.
6. Recreate Storage RLS/access policies. This repository currently has no Storage policy SQL, so export and store the intended production Storage policies before launch.
7. Run app smoke tests for every feature that reads or uploads files.

### Pre-launch backup checklist

- [ ] Replace permissive `USING (true)` Supabase table policies with production RLS policies.
- [ ] Create the independent S3/S3-compatible backup bucket with versioning enabled.
- [ ] Add all required GitHub secrets and alert webhook.
- [ ] Run the backup workflow manually with storage backup and restore test enabled.
- [ ] Confirm encrypted database and storage backups are present in the independent bucket.
- [ ] Confirm the workflow failure alert reaches the responsible operator.
- [ ] Export/document production Supabase Storage bucket policies before accepting real uploads.

## Support

Contact a0 support for:
- Scaling recommendations
- Performance optimization
- Custom integrations
