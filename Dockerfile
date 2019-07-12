FROM node

WORKDIR /app

COPY . /app

RUN npm install

EXPOSE 3020

CMD ["npm", "start"]
