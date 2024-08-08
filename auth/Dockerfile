FROM node:18

ARG certname=server
COPY certificates /etc/ssl/certs

WORKDIR /usr/src/app/auth

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build
# COPY .env.prod .

RUN find /etc/ssl/certs -name "${certname}*" -exec chmod 750 {} +

CMD ["npm", "run", "start:prod"]
