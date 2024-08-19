FROM node:18

WORKDIR /usr/src/app/auth

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "run", "start:prod"]
