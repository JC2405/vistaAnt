FROM nginx:1.27-alpine

# Limpiar la configuración por defecto de Nginx (opcional)
RUN rm /etc/nginx/conf.d/default.conf

# Copiar archivos del frontend al directorio de Nginx
COPY . /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]