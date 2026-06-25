FROM node:22-alpine

WORKDIR /usr/src/app

# Installer les dépendances en premier (cache de build)
COPY package.json ./
RUN npm install --omit=dev

# Copier le reste de l'application
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
