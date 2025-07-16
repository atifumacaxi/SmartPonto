# SmartPonto - Time Tracking App

A modern time tracking application that uses OCR to extract work hours from time cards and invoices. Built with FastAPI (Python) backend and React (TypeScript) frontend.

## Features

- 📸 **Photo Capture**: Take photos of time cards or upload images
- 🔍 **OCR Processing**: Automatically extract dates and times using Tesseract OCR
- ⏰ **Time Tracking**: Register start and end times for work sessions
- 📊 **Monthly Targets**: Set and track monthly work hour goals
- 📈 **Dashboard**: View daily and monthly summaries
- 🗂️ **Time Entries**: Manage and delete time entries
- 🔐 **User Authentication**: Secure login system

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd SmartPonto
   ```

2. **Start with Docker**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Production Deployment

**Recommended: Render.com (Free Tier)**

1. **Prepare for deployment**
   ```bash
   ./deploy.sh
   ```

2. **Follow the deployment guide**
   - Read [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions
   - Deploy to Render.com with free PostgreSQL database
   - Get HTTPS and custom domain support

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Database ORM
- **PostgreSQL** - Production database (SQLite for development)
- **Tesseract OCR** - Image text extraction
- **OpenCV** - Image processing
- **JWT** - Authentication

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Router** - Navigation

### Infrastructure
- **Docker** - Containerization
- **Render.com** - Hosting platform
- **PostgreSQL** - Database

## Project Structure

```
SmartPonto/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── models.py       # Database models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── auth.py         # Authentication
│   │   ├── ocr_service.py  # OCR processing
│   │   └── routers/        # API routes
│   ├── Dockerfile          # Backend container
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   └── services/       # API services
│   ├── Dockerfile          # Frontend container
│   └── package.json        # Node dependencies
├── docker-compose.yml      # Local development
├── deploy.sh              # Deployment script
└── DEPLOYMENT.md          # Deployment guide
```

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Time Entries
- `POST /time-entries/upload` - Upload photo for OCR
- `POST /time-entries/confirm` - Confirm time entry
- `GET /time-entries/monthly` - Monthly summary
- `GET /time-entries/all` - All entries for month
- `DELETE /time-entries/{id}` - Delete entry

### Monthly Targets
- `GET /monthly-targets/{year}/{month}` - Get target
- `POST /monthly-targets` - Create target
- `PUT /monthly-targets/{id}` - Update target

## Environment Variables

### Backend
```env
DATABASE_URL=postgresql://user:password@host:port/db
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend
```env
REACT_APP_API_URL=http://localhost:8000
```

## Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## Deployment Options

### Free Tier
- **Render.com** - Complete solution with PostgreSQL
- **Railway** - Easy deployment with database
- **Vercel + Railway** - Frontend + Backend

### Paid Options
- **AWS** - Scalable cloud infrastructure
- **DigitalOcean** - VPS with managed database
- **Heroku** - Platform as a Service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For deployment help, see [DEPLOYMENT.md](DEPLOYMENT.md) or create an issue in the repository.
