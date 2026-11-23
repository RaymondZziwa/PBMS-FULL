# Deploying PBMS to the live server

The live database already holds 10,000+ records. Every step below is written so
nothing is lost: **back up first, check before you change, and know how to go back.**

Do this in a quiet hour (evening or weekend). Budget 30–45 minutes.

---

## 0. What this release changes in the database

| Migration | What it does | Risk |
|---|---|---|
| `20261122090000_hr_indexes` | Adds indexes on `Attendance` and `PayrollPeriods` so HR screens load fast | Safe. Adds no columns, deletes nothing. Takes a few seconds on large tables. |
| `20261123100000_employee_optional_login` | Makes `employees.email` and `employees.password` optional (for staff who don't use the system) | Safe. Existing values are kept. |
| `20261124090000_monk_club` | Adds the Monk Loyalty Club tables and a `isForClub` flag on wallets | Safe. New tables only; one new column with a default. |
| `20261125090000_club_marketplace` | Adds the club shop: settings (discount, store), orders and order items; links club payments to orders | Safe. New tables; one new empty column. |
| `20261125100000_club_card_signing` | Card version and scan count on club members (signed QR codes) | Safe. Three new columns with defaults. |

No table is dropped and no data is rewritten.

---

## 1. Back up (do not skip)

On the server:

```bash
# Replace user/db names with yours. You'll be asked for the password.
mysqldump -u pbms_user -p --single-transaction --routines --triggers --no-tablespaces \
  pbms_db > ~/backups/pbms_$(date +%Y%m%d_%H%M).sql

# Check it isn't empty and finished properly:
ls -lh ~/backups/ | tail -1
tail -1 ~/backups/pbms_*.sql | grep "Dump completed"
```

Also copy the uploaded files (logos, prescriptions, receipts):

```bash
tar -czf ~/backups/pbms_uploads_$(date +%Y%m%d).tgz -C /path/to/PBMS-BKD uploads $( [ -d /path/to/PBMS-BKD/private ] && echo private )
```

Download both files to your own computer as well. A backup that only lives on
the server is lost if the server is.

**Best practice:** restore the backup into a copy database (`pbms_test`) and run
steps 2–4 there first. If it works on the copy, it will work on live.

```bash
mysql -u pbms_user -p -e "CREATE DATABASE pbms_test"
mysql -u pbms_user -p pbms_test < ~/backups/pbms_YYYYMMDD_HHMM.sql
```

---

## 2. Check how the live database was set up

```bash
cd /path/to/PBMS-BKD
git pull                     # or upload the new code
npm ci
npx prisma migrate status
```

What you might see:

- **"Database schema is up to date" / lists the two new migrations as not yet applied** → go to step 3.
- **"The table `_prisma_migrations` does not exist"** or **`20260105085019_init` not applied** →
  the live database was made with `prisma db push`, not migrations. Tell Prisma the
  starting point is already there (this changes nothing in your tables, it only records it):

  ```bash
  npx prisma migrate resolve --applied 20260105085019_init
  npx prisma migrate status   # now only the two new ones should be pending
  ```

### Check for drift (differences Prisma doesn't know about)

```bash
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/drift.sql
less /tmp/drift.sql
```

The file should only contain the index and the two `MODIFY` lines from step 0.
If it contains **`DROP`** of anything, **stop**: the live database has something the
code doesn't know about. Send me `/tmp/drift.sql` before going further.

---

## 3. Apply the migrations

```bash
npx prisma migrate deploy      # never use "migrate dev" or "db push" on live
npx prisma generate
```

`migrate deploy` only runs migrations that haven't run yet and never resets data.

---

## 4. Settings (.env)

Make sure the server's `.env` has these (values are examples):

```bash
NODE_ENV=production
DATABASE_URL="mysql://pbms_user:PASSWORD@localhost:3306/pbms_db"

# At least 32 random characters each. The API refuses to start without them.
# Generate with:  openssl rand -base64 48
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Password-reset emails (Resend)
RESEND_API_KEY=re_...
RESEND_FROM="PBMS <no-reply@yourdomain.com>"
```

Changing either JWT secret signs everyone out once. That's expected.

**Monk Loyalty Club** (add when you deploy the club):

```bash
# Where the member app runs (CORS) and the link used in emails
CLUB_APP_ORIGINS=https://club.your-domain.com
CLUB_APP_URL=https://club.your-domain.com
# Public address of this API, used for MarzPay callbacks
CLUB_API_PUBLIC_URL=https://pbmsapi.megaerpug.com

# MarzPay (same account as the shop). Already set if the POS takes mobile money.
MARZ_COLLECTION_BASE_URL=...
MARZ_AUTH_HEADER=...
MARZ_TRANSFER_BASE_URL=...
MARZ_WALLET_SRC=...
# Optional but recommended: lets the API double-check each payment with MarzPay
MARZ_COLLECTION_STATUS_URL=https://.../collect-money/{reference}

# SMS for members without email (same gateway as password resets)
SMS_URL=...
SMS_SECRET=...

# Key that signs the QR codes on membership cards (32+ random characters).
# Set it once and keep it: changing it makes every member's QR code invalid.
# If missing, a key derived from JWT_SECRET is used (then changing JWT_SECRET also invalidates cards).
CLUB_CARD_SECRET=...

# Test mode for club payments: never set this on the live server
# (it is ignored when NODE_ENV=production anyway).
# CLUB_SIMULATE_PAYMENTS=success

# Fees (defaults shown)
CLUB_REGISTRATION_FEE=50000
CLUB_MARZ_FEE_PERCENT=3
CLUB_SERVICE_FEE=1000
```

Members' ID copies are stored in `PBMS-BKD/private/club/` (never served publicly).
Include that folder in your backups, next to `uploads/`, and keep it out of git.

**The member app (`MONK-CLUB`)** is a separate website. Build it with
`npm install && npm run build` (set `VITE_API_URL` in `MONK-CLUB/.env` to this API's
public address first) and upload `MONK-CLUB/dist/` to its host. Its address must be in
`CLUB_APP_ORIGINS` above. See `MONK-CLUB/README.md`.

---

## 5. Build and restart the API

```bash
npm run build
pm2 restart pbms-api --update-env   # use your PM2 app name (pm2 ls)
pm2 logs pbms-api --lines 50        # look for "Nest application successfully started"
```

On first start the API adds any new permissions to the `permissions` table by itself.

---

## 6. Build and upload the web app

On your computer, in `PBMS-NEW-FTD`:

```bash
npm ci
npm run build          # makes the dist/ folder
```

Upload the contents of `dist/` to the web root on the server (replace the old
files). Keep the old folder as `dist_old` until you've checked step 7.

---

## 7. Check it works

1. Sign in as an administrator.
2. Open **HR → Employees** and **Payroll**: lists load quickly; old records are all there.
3. Open **Settings → Company profile, Branches, Roles & permissions**.
4. Open **Prescription database**: old prescriptions show with all their images.
5. Sell one cheap item on the POS, then void/delete it.
6. Leave a tab idle for 9 minutes: the "Still there?" countdown appears.
7. Compare record counts with the backup (should be identical):

   ```sql
   SELECT (SELECT COUNT(*) FROM employees) emp, (SELECT COUNT(*) FROM clients) clients,
          (SELECT COUNT(*) FROM ClientPrescription) rx;
   ```

8. **Give the new permissions to roles** under Settings → Roles & permissions
   (for example *Record attendance* for supervisors). Admin roles already have everything.

---

## 8. If something goes wrong (roll back)

**The app misbehaves but data is fine** → put the old code back:

```bash
git checkout <previous-commit>   # or re-upload the old build
npm ci && npm run build && pm2 restart pbms-api
# web: rename dist_old back to the web root
```

The two migrations are compatible with the old code (an index and two optional
columns), so you don't need to undo them.

**Data looks wrong** → restore the backup (this replaces everything since step 1):

```bash
pm2 stop pbms-api
mysql -u pbms_user -p pbms_db < ~/backups/pbms_YYYYMMDD_HHMM.sql
pm2 start pbms-api
```

---

## For every future release

1. Back up (step 1).
2. `npx prisma migrate status` and read what's pending.
3. `npx prisma migrate deploy` (never `db push` / `migrate dev` on live).
4. Build, restart, check.
