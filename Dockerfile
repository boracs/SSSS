FROM php:8.2-fpm

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip

# Instalar extensiones de PHP para MySQL
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Instalar Node.js y NPM (necesario para Vite/React)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Traer Composer desde su imagen oficial
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Arrancar el servidor de Laravel
CMD php artisan serve --host=0.0.0.0 --port=8000