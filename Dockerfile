FROM node:14.15.0-alpine

ARG REVISION=""

ENV TZ=Europe/Oslo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /var/service/app

COPY package*.json ./
COPY .npmrc .npmrc

COPY . .
RUN npm install --production

RUN echo ${REVISION} > REVISION

RUN rm -f .npmrc

EXPOSE 8080

CMD ["npm", "start"]
