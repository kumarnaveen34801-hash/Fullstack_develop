# Shipped Resume Parser

React frontend for the resume parser demo. It uploads PDF resumes and required
job descriptions to the Express API in `../backend`.

## Run locally

```sh
cd frontend
npm install
npm run dev
```

The Vite development server proxies API requests to `http://localhost:5000`.
Start the backend and configure its MongoDB connection before analyzing resumes.
Scanned image-only PDFs are not supported.

## Production build

```sh
npm run build
npm run preview
```
