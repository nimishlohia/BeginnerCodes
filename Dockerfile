# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# Production build defaults to same-origin relative /api/... requests
ARG VITE_GA_MEASUREMENT_ID=G-V187F2K2C2
ENV VITE_GA_MEASUREMENT_ID=${VITE_GA_MEASUREMENT_ID}
RUN npm run build

# Stage 2: FastAPI backend serving API + built frontend
FROM python:3.13-slim AS runtime
WORKDIR /app/backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 8000

CMD ["sh", "-c", "python -m alembic upgrade head && python scripts/seed_challenges.py && python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
