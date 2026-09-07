# FraudLens

**FraudLens — Explainable Behaviour-Based Financial Fraud Detection**

## Project Description
FraudLens is a full-stack financial fraud detection system designed to analyze transaction behavior and deliver explainable risk insights. This repository currently hosts the foundational Phase 1 architecture connecting a React/Vite frontend to a modular FastAPI backend with decoupled service abstractions.

## Current Tech Stack
- **Frontend**: React 19, Vite, JavaScript (JSX), Tailwind CSS
- **Backend**: Python 3.13, FastAPI, Uvicorn, Pydantic v2
- **Architecture**: Modular service layer ready for future ML model integration

## Folder Structure
```text
FraudLens/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── health.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py
│   │   ├── models/
│   │   │   └── __init__.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── health.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── fraud_service.py
│   │   ├── __init__.py
│   │   └── main.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Local Setup Instructions

### Prerequisites
- Node.js (v18+ recommended) & npm
- Python (v3.10+ recommended) & venv

---

### Backend Setup & Startup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables (optional, defaults provided):
   ```bash
   cp .env.example .env
   ```
5. Start the backend server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   The backend API will be available at `http://localhost:8000`.

---

### Frontend Setup & Startup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend application will be available at `http://localhost:5173`.

---

## API Health Endpoint
- **URL**: `GET http://localhost:8000/api/health`
- **Response Format**:
  ```json
  {
    "status": "ok",
    "service": "FraudLens API"
  }
  ```
- **Interactive Documentation**: `http://localhost:8000/docs`
