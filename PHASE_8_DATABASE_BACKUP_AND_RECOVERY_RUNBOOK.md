# SWAYAM ADMISSION — PHASE 8 DATABASE BACKUP AND DISASTER RECOVERY RUNBOOK
## Neon PostgreSQL Backup, Point-In-Time Recovery (PITR), and Disaster Resilience

**Document Version:** 1.0.0  
**Phase:** Phase 8 — SRE & Database Reliability  
**Target Database:** Neon PostgreSQL (`ep-billowing-feather-b5bti4hu.c-7.us-east-2.aws.neon.tech`)  
**Application ORM:** Prisma Client 6.9.0  

---

## 1. Verified Neon PostgreSQL Architecture & Plan Capabilities

The Swayam Admission database is hosted on **Neon**, a serverless PostgreSQL platform built on separation of storage and compute.

### Current Tier & Capabilities
- **Neon Plan:** Free / Starter Tier
- **Point-in-Time Recovery (PITR):** Available for **24 hours** on Free Tier; up to **30 days** on Neon Pro / Enterprise plans.
- **Instant Branching (Copy-on-Write):** Supported natively. Enables instant creation of an isolated, read-write staging or recovery branch from any past transaction timestamp without duplicating storage.
- **Physical Snapshots:** Managed continuously via Neon's Write-Ahead Log (WAL) architecture in object storage (AWS S3).

### Disaster Recovery Objectives (SLA Targets)
| Metric | Free Tier (Current) | Recommended Pro Plan |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **≤ 24 hours** (max transaction loss in severe disaster) | **≤ 5 minutes** (near real-time recovery via continuous WAL) |
| **Recovery Time Objective (RTO)** | **≤ 15 minutes** (time to branch, verify, and point backend) | **≤ 5 minutes** (automated failover or instant branch switch) |

---

## 2. Pre-Recovery Operational Rules & Safety Constraints

> [!CAUTION]
> **CRITICAL PRODUCTION DATABASE RULES:**
> 1. **NEVER run `npx prisma migrate reset` against production or staging.** This drops the entire database schema and destroys all records irreversibly.
> 2. **NEVER execute destructive SQL (`DROP TABLE`, `TRUNCATE`, or unqualified `DELETE`)** without written authorization and an active branch snapshot.
> 3. **NEVER commit database credentials, connection strings, or raw `.sql` dumps to Git.**
> 4. **All recovery drills must be executed on an isolated Neon branch**, never against the `main` production branch.

---

## 3. Disaster Recovery Procedures

### Scenario A: Instant Branching Recovery (Accidental Data Corruption or Erroneous Deploy)
Neon's instant branching allows creating a fully functional database clone from a timestamp immediately preceding the incident:

1. **Access Neon Console:**
   - Log in to [Neon Console](https://console.neon.tech).
   - Select the `swayam-admission` project.
2. **Identify Incident Timestamp:**
   - Review backend audit logs (`AuditLog` table) or Render deployment logs to pinpoint the exact UTC timestamp of corruption (e.g., `2026-10-21T18:45:00Z`).
3. **Create Recovery Branch via Dashboard or Neon CLI:**
   - Click **Branches** > **New Branch**.
   - **Branch Name:** `recovery-drill-YYYYMMDD` or `prod-hotfix-YYYYMMDD`.
   - **Parent Branch:** `main`.
   - **Point in Time:** Select **"Past point in time"** and enter the target timestamp (e.g., 5 minutes prior to corruption).
   - Click **Create Branch**.
4. **Obtain Branch Connection String:**
   - In the new branch overview, copy the connection string:
     `postgresql://<user>:<pass>@ep-<new-branch>.c-7.us-east-2.aws.neon.tech/swayam_db?sslmode=require`

---

### Scenario B: Manual Logical Backup via `pg_dump` (Cold Backup Routine)

Run this procedure prior to major releases or scheduled maintenance:

```bash
# Set secure environment variable (do NOT put password directly in command line)
export PGPASSWORD="<PROD_DB_PASSWORD>"

# Execute pg_dump with custom compressed archive format
pg_dump -h ep-billowing-feather-b5bti4hu.c-7.us-east-2.aws.neon.tech \
        -U neondb_owner \
        -d neondb \
        -p 5432 \
        --no-owner \
        --no-privileges \
        -F c \
        -f swayam_backup_$(date +%Y%m%d_%H%M%S).dump

# Verify dump file size and structure
ls -lh swayam_backup_*.dump
```

*Note: Store the encrypted `.dump` file in a restricted, access-controlled AWS S3 bucket with 90-day lifecycle expiration. Never store it on local public drives.*

---

### Scenario C: Restoring Logical Backup to Staging / Recovery Database

```bash
# 1. Ensure target database exists and is an ISOLATED staging environment
export PGPASSWORD="<STAGING_DB_PASSWORD>"

# 2. Restore schema and data via pg_restore
pg_restore -h <STAGING_HOST> \
           -U <STAGING_USER> \
           -d <STAGING_DBNAME> \
           -p 5432 \
           --clean \
           --if-exists \
           --no-owner \
           --no-privileges \
           swayam_backup_YYYYMMDD_HHMMSS.dump
```

---

## 4. Post-Recovery Data Integrity & Consistency Checks

Following any restore or branch switch, run the following verification queries to confirm database health:

### 1. Essential Record Counts
```sql
SELECT 'Users' AS entity, COUNT(*) FROM "User"
UNION ALL
SELECT 'StudentProfiles', COUNT(*) FROM "StudentProfile"
UNION ALL
SELECT 'Applications', COUNT(*) FROM "Application"
UNION ALL
SELECT 'Colleges', COUNT(*) FROM "College"
UNION ALL
SELECT 'CommunicationDeliveries', COUNT(*) FROM "CommunicationDelivery"
UNION ALL
SELECT 'AuditLogs', COUNT(*) FROM "AuditLog";
```
*Expected: Non-zero counts consistent with pre-incident benchmarks.*

### 2. Relational Integrity Checks
```sql
-- Check for orphan applications
SELECT COUNT(*) AS orphan_applications 
FROM "Application" a 
LEFT JOIN "User" u ON a."userId" = u."id" 
WHERE u."id" IS NULL;

-- Check for orphan student profiles
SELECT COUNT(*) AS orphan_profiles 
FROM "StudentProfile" sp 
LEFT JOIN "User" u ON sp."userId" = u."id" 
WHERE u."id" IS NULL;

-- Check for stuck outbox items
SELECT status, COUNT(*) 
FROM "CommunicationDelivery" 
GROUP BY status;
```
*Expected: 0 orphan applications, 0 orphan profiles.*

### 3. Application Schema Alignment
From `backend/`:
```bash
# Validate that restored DB matches current Prisma schema
npx prisma migrate status
```
*Expected output: `Database schema is up to date!`*

---

## 5. Cutover & Backend Repointing Procedure

When restoring via a new Neon branch:

1. **Update Render Environment:**
   - Log into [Render Dashboard](https://dashboard.render.com).
   - Navigate to `swayam-admission-backend` > **Environment**.
   - Update `DATABASE_URL` with the new verified branch connection string.
   - Click **Save Changes** (triggers automated zero-downtime rolling restart).
2. **Verify Health Probes:**
   - Probe liveness: `curl -I https://swayam-admission.onrender.com/v1/health/liveness` (Expect 200 OK).
   - Probe readiness: `curl -I https://swayam-admission.onrender.com/v1/health/readiness` (Expect 200 OK, verifying DB connected).
   - Probe worker: `curl https://swayam-admission.onrender.com/v1/health/worker` (Expect status `HEALTHY` or `DEGRADED` depending on queue age).
3. **Log Incident Recovery:**
   - Record incident duration, root cause, and recovery timestamp in `AuditLog` table.
