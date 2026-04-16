FROM nginx:alpine

# Copiar todos los archivos al directorio que Nginx sirve por defecto
COPY . /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Arrancar Nginx
CMD ["nginx", "-g", "daemon off;"]