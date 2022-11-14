FROM node:17

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000/tcp

CMD ["npm", "run", "dev"]