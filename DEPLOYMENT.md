# SmartPonto Deployment Guide - Render.com

## Overview
This guide will help you deploy SmartPonto to Render.com with a free PostgreSQL database.

## Prerequisites
- GitHub account
- Render.com account (free)
- Your SmartPonto code pushed to GitHub

## Step 1: Prepare Your Repository

### 1.1 Push to GitHub
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 1.2 Create Environment Variables
Create a `.env` file for local testing (don't commit this):
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/smartponto
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Step 2: Deploy to Render.com

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Connect your GitHub repository

### 2.2 Create PostgreSQL Database
1. In Render dashboard, click "New +"
2. Select "PostgreSQL"
3. Configure:
   - **Name**: `smartponto-db`
   - **Database**: `smartponto`
   - **User**: `smartponto_user`
   - **Region**: Choose closest to you
   - **Plan**: Free (for now)
4. Click "Create Database"
5. Copy the **Internal Database URL** (you'll need this)

### 2.3 Deploy Backend
1. In Render dashboard, click "New +"
2. Select "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `smartponto-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app.main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
5. Add Environment Variables:
   - `DATABASE_URL`: (paste the Internal Database URL from step 2.2)
   - `SECRET_KEY`: (generate a random secret key)
   - `ALGORITHM`: `HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES`: `30`
6. Click "Create Web Service"

### 2.4 Deploy Frontend
1. In Render dashboard, click "New +"
2. Select "Static Site"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `smartponto-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
5. Add Environment Variable:
   - `REACT_APP_API_URL`: (your backend URL from step 2.3)
6. Click "Create Static Site"

## Step 3: Database Migration

### 3.1 Run Migrations
1. Go to your backend service in Render
2. Click on "Shell" tab
3. Run:
```bash
alembic upgrade head
```

### 3.2 Create Admin User
1. In the same shell, run:
```bash
python -c "
from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

db = SessionLocal()
user = User(
    email='admin@example.com',
    username='admin',
    full_name='Admin User',
    hashed_password=get_password_hash('your-password-here')
)
db.add(user)
db.commit()
db.close()
print('Admin user created!')
"
```

## Step 4: Test Your Deployment

1. Visit your frontend URL
2. Login with the admin credentials you created
3. Test the photo upload and time tracking features

## Step 5: Custom Domain (Optional)

1. In your frontend service settings, add your custom domain
2. Configure DNS to point to Render
3. SSL certificate will be automatically provisioned

## Scaling

### Free Tier Limits
- **Backend**: 750 hours/month (enough for 24/7 single user)
- **Database**: 1GB storage, 90 days retention
- **Frontend**: Unlimited

### When to Upgrade
- More than 1 user
- Need more database storage
- Want faster response times

### Upgrade Process
1. Go to service settings
2. Change plan to "Starter" ($7/month)
3. No code changes needed

## Monitoring

### Logs
- View logs in Render dashboard
- Set up log forwarding if needed

### Health Checks
- Render automatically monitors your services
- Set up custom health check endpoints

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL environment variable
   - Ensure database is created and running

2. **Build Fails**
   - Check requirements.txt
   - Verify Python version compatibility

3. **OCR Not Working**
   - Ensure Tesseract is installed in Dockerfile
   - Check file upload permissions

### Support
- Render documentation: https://render.com/docs
- Render community: https://community.render.com

## Security Notes

1. **Environment Variables**: Never commit secrets to Git
2. **Database**: Use strong passwords
3. **HTTPS**: Automatically enabled by Render
4. **Updates**: Keep dependencies updated

## Backup Strategy

1. **Database**: Render provides automatic backups
2. **Code**: Use Git for version control
3. **Files**: Consider cloud storage for uploaded images

## Cost Estimation

### Free Tier (Single User)
- Backend: $0/month
- Database: $0/month
- Frontend: $0/month
- **Total: $0/month**

### Starter Tier (Multiple Users)
- Backend: $7/month
- Database: $7/month
- Frontend: $0/month
- **Total: $14/month**
