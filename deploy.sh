#!/bin/bash

# Останавливаем старые контейнеры
echo "Stopping existing containers..."
docker-compose down

# Собираем образы заново
echo "Building images..."
docker-compose build

# Применяем миграции
echo "Applying migrations..."
docker-compose run --rm web python manage.py migrate

# Собираем статику
echo "Collecting static files..."
docker-compose run --rm web python manage.py collectstatic --noinput

# Запускаем контейнеры
echo "Starting containers..."
docker-compose up -d

# Вывод статуса
echo "✅ Деплой завершён! Приложение доступно по адресу: http://127.0.0.1/command/"
docker-compose ps
