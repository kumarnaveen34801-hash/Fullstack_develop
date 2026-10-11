# Shipped Resume Parser

This project contains a React/Vite frontend and an Express API that extracts
text from PDF resumes, compares skills with a required job description, and
saves analysis results in MongoDB. Matching is rule-based; AI integration is
not included.

## Requirements

- Node.js 20.16+ (or 22.3+)
- MongoDB, local or hosted

## Run locally

1. Configure MongoDB:

   ```sh
   Copy-Item backend/.env.example backend/.env
   ```

   Edit `backend/.env` and set `MONGODB_URI` to your MongoDB connection string.

2. Start the API in one terminal:

   ```sh
   cd backend
   npm install
   npm run dev
   ```

3. Start the frontend in another terminal:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

The Vite development server proxies `/api` requests to `http://localhost:5000`.
Set `API_PROXY_TARGET` if the backend uses a different address.

The API accepts `POST /api/analyses` as multipart form data with a `resume` PDF
and required `jobDescription` text. Uploaded files are processed in memory and
are not stored; analysis metadata and the job description are saved in MongoDB.
Uploads are limited to 10 MB. `GET /api/health` reports API and database status.

## Test and build

```sh
cd backend
npm test

cd ../frontend
npm run build
```
