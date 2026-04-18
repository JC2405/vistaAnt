FROM nginx:alpine

# Copiar la configuracion interna de nginx para manejar SPA y cache.
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copiar todos los archivos estaticos al directorio que nginx sirve por defecto.
COPY . /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Arrancar Nginx
CMD ["nginx", "-g", "daemon off;"]
