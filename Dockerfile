FROM node:9.4

WORKDIR /usr/src/app

EXPOSE 5000

RUN npm install -g serve

COPY . .

RUN npm install

CMD ["/usr/src/app/run.sh"]