FROM node:18.16.0-bullseye

# Install dependencies
RUN apt update
RUN apt install -y \
    g++ \
    build-essential \
    chromium \
    ca-certificates \
    fonts-freefont-ttf

# Set Chromium as the default browser
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
RUN npm install -g @nestjs/cli
COPY package*json ./

RUN yarn install
COPY . .

RUN yarn run build
EXPOSE 3000
CMD ["yarn", "run", "start:dev"]