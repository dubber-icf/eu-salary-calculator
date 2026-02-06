# EU Salary Calculator

A Next.js application for calculating EU project staff salaries with cumulative truing logic.

## Quick Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/dubber-icf/eu-salary-calculator)

### Manual Deployment

1. Create a PostgreSQL database on Render
2. Create a Web Service with:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
3. Set environment variable:
   - `DATABASE_URL` (auto-provided when linked to Render database)
4. Run the seed script via Render's Shell:
   ```bash
   npm run seed
   ```

## Development

```bash
# Install dependencies
npm install

# Set up local PostgreSQL database
export DATABASE_URL="postgresql://user:pass@localhost:5432/eu_salary_calculator"

# Run database migrations/schema
npm run seed

# Start development server
npm run dev
```

## Features

- Staff management with FTE history
- Project and period tracking
- Monthly timesheet entry (quarter-day precision)
- EU salary calculation with cumulative truing
- ECB exchange rate integration
- Full audit trail for EU compliance

## Tech Stack

- Next.js 14
- React 18
- PostgreSQL
- TypeScript
- TailwindCSS
