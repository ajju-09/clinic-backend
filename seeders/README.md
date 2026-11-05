# Development demo data

The development seeder creates synthetic records for doctor setup, clinics,
patients and medical history, visits and diagnoses, prescriptions, lab orders,
medicine stock and alerts, expenses, and audit logs. It uses reserved
`example.test` email addresses and `DEMO` identifiers. It does not upload files
to Cloudinary or create real patient documents.

Run only against a local development database after applying all migrations:

```powershell
$env:NODE_ENV = "development"
$env:CONFIRM_DEMO_SEED = "YES"
npm run seed:development
```

The script refuses to run outside `NODE_ENV=development`, requires explicit
confirmation, and only connects to a loopback host. Rerunning it updates the
same synthetic records rather than deleting existing data.

Calendar demo data for `doctor.demo3@example.test` can be seeded separately
after the development account and clinic exist and all database migrations
have been applied:

```powershell
$env:NODE_ENV = "development"
$env:CONFIRM_CALENDAR_DEMO_SEED = "YES"
npm run seed:calendar:development
```

This calendar-only seeder also requires a loopback database and the explicit
confirmation flag. It creates or updates synthetic events across event types,
priorities, statuses, all-day and timed schedules, reminder states, and private
daily notes. Demo reminder jobs use the account's verified `example.test`
address. It does not overwrite existing non-demo daily notes or delete data.

All demo accounts use `DemoPass123!`:

- `doctor.demo1@example.test` — completed profile
- `doctor.demo2@example.test` — incomplete profile for setup-flow testing
- `doctor.demo3@example.test` — completed profile with multiple specialties
- `admin.demo@example.test` — admin account
- `doctor.pending@example.test` — pending account
- `doctor.suspended@example.test` — suspended account

Do not use these credentials outside the development environment.
