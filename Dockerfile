FROM nginx:alpine

# Copiar la configuracion interna de nginx para manejar SPA y cache.
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copiar todos los archivos estaticos al directorio que nginx sirve por defecto.
COPY . /usr/share/nginx/html

# Version de assets para invalidar cache en cada build.
# Si no se envia APP_VERSION, usa timestamp del build.
ARG APP_VERSION
RUN set -eux; \
    version="${APP_VERSION:-$(date +%s)}"; \
    find /usr/share/nginx/html -type f \( -name "*.html" -o -name "*.js" \) \
      -exec sed -i -E "s/([?&]v=)[^\"'[:space:])]+/\\1${version}/g" {} +

# Exponer el puerto 80
EXPOSE 80

# Arrancar Nginx
CMD ["nginx", "-g", "daemon off;"]
