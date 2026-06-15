FROM python:3.12-slim

WORKDIR /app
COPY pyproject.toml alembic.ini /app/
COPY app /app/app
COPY alembic /app/alembic
RUN pip install --no-cache-dir .

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
