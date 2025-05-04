#!/bin/bash

echo "Stopping existing containers..."
docker-compose down

echo "Building images..."
docker-compose build

echo "Applying migrations..."
docker-compose run --rm web python manage.py migrate

echo "Collecting static files..."
docker-compose run --rm web python manage.py collectstatic --noinput

echo "Starting containers..."
docker-compose up -d

echo "✅ Деплой завершён! Приложение доступно по адресу: http://127.0.0.1/command/"
docker-compose ps
