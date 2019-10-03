FROM node:10.11.0-stretch
WORKDIR /home/node
USER node
ADD . /home/node
EXPOSE 4000
ENTRYPOINT ["node", "index.js"]
