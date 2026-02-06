# Render Deployment Guide

## Prerequisites

1. GitHub account with repository access
2. Render account (free tier works)

## Step 1: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **PostgreSQL**
3. Configure:
   - **Name**: `eu-salary-db`
   - **Database**: `eu_salary_calculator`
   - **User**: `eu_salary_user`
   - **Plan**: Free (Starter)
   - **Region**: Frankfurt (EU) - for GDPR compliance
4. Click **Create Database**
5. **Copy the connection string** (you'll need it for the web service)

## Step 2: Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Configure:
   - **GitHub Repository**: Select `dubber-icf/eu-salary-calculator`
   - **Branch**: `master`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
   - **Region**: Frankfurt (EU)
4. Click **Create Web Service**
5. Wait for the build to complete

## Step 3: Configure Environment Variables

1. In your web service, click **Environment**
2. Add the following variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the connection string from Step 1 (format: `postgresql://user:password@hostname:5432/database`)
3. Click **Save Changes**
4. The service will automatically restart

## Step 4: Seed the Database

1. In your web service, click **Shell**
2. Run the seed command:
   ```bash
   npm run seed
   ```
3. You should see: "Database seeded successfully!"

## Step 5: Test the Application

1. Click the **URL** shown in your web service (e.g., `https://eu-salary-calculator.onrender.com`)
2. Verify the dashboard loads with:
   - Staff count
   - Projects count
   - ECB rates seeded

## Testing the Calculation

1. Navigate to **Calculate Salary**
2. Select **Polina Ivanova** (60% FTE)
3. Select **December 2025**
4. Click **Calculate Payment**
5. You should see:
   - EU Project allocations (4 days LUMEN, 7 days GRAPHIA)
   - Gross payment in SEK
   - Full calculation breakdown

## Troubleshooting

### Build Fails
- Check that all dependencies in `package.json` are correct
- Ensure TypeScript types are valid: `npx tsc --noEmit`

### Database Connection Error
- Verify `DATABASE_URL` is correctly set
- Check the database is in the same region as the web service
- Ensure the database is running (not suspended)

### Seed Errors
- Make sure the database is empty before seeding
- Check database connection string format

### Application Errors
- Check **Logs** tab in Render dashboard
- Look for TypeScript compilation errors
- Verify all environment variables are set

## Configuration Files

The project includes:
- `render.yaml` - Render blueprint for infrastructure-as-code
- `package.json` - Dependencies and scripts

## Production URLs

Once deployed:
- **Production**: `https://eu-salary-calculator.onrender.com`
- **API Base**: `https://eu-salary-calculator.onrender.com/api`

## Updating the Application

1. Push changes to GitHub
2. Render automatically detects the update
3. New build starts automatically
4. Zero-downtime deployment (for paid plans)

## Deleting Resources

To clean up:
1. Delete the **Web Service** first
2. Then delete the **PostgreSQL database**
