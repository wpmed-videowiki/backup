
FROM node:alpine

WORKDIR /home/videowiki-backuper

COPY ./ ./

RUN npm install

CMD ["npm", "start"]
