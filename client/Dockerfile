#
# NOTE: THIS DOCKERFILE IS GENERATED VIA "update.sh"
#
# PLEASE DO NOT EDIT IT DIRECTLY.
#
FROM node:18 AS CLIENT_BUILD

WORKDIR /usr/src/app/client

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:latest

ARG certname=steamscraper.io

COPY --from=CLIENT_BUILD /usr/src/app/client/dist/. /usr/share/nginx/html/
COPY --from=CLIENT_BUILD /usr/src/app/client/nginx.conf /etc/nginx/conf.d/default.conf

# COPY --from=CLIENT_BUILD /usr/src/app/client/certificates/. /etc/ssl/certs

RUN find /etc/ssl/certs -name "${certname}*" -exec chmod 750 {} + && chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
