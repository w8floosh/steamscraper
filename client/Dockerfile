FROM node:18

WORKDIR /usr/src/app/client

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

RUN npm install -g http-server
EXPOSE 8080
CMD ["http-server", "-p", "8080"]
