# Monthly Interest Calculation Function

This Edge Function automatically calculates and applies monthly interest to all active accounts.

## Usage

### Manual Trigger

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/monthly-interest' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

### With Specific Month

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/monthly-interest' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"month": "2024-01"}'
```

## Cron Job Setup

### Using GitHub Actions

Create `.github/workflows/monthly-interest.yml`:

```yaml
name: Monthly Interest Calculation
on:
  schedule:
    - cron: "0 0 1 * *" # Run on the 1st of every month at midnight UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  calculate-interest:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST 'https://your-project.supabase.co/functions/v1/monthly-interest' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}'
```

### Using Vercel Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/trigger-interest",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

### Using Railway Cron Jobs

Set up a cron job to call the Supabase Edge Function endpoint.

## Environment Variables

Required environment variables for the Edge Function:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for admin operations)

## Security Notes

- This function requires service role permissions to modify database records
- Consider rate limiting and authentication for production use
- Log all interest calculations for audit purposes
