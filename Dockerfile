# Frontend estático (HTML + JS vanilla)
FROM nginx:1.27-alpine

# Copiar todos los archivos del frontend al directorio de Nginx
COPY . /usr/share/nginx/html

# Exponer puerto 80
EXPOSE 80

# Arrancar Nginx
CMD ["nginx", "-g", "daemon off;"]