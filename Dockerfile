FROM node:18

WORKDIR /app

COPY project/package*.json ./
RUN npm install
RUN npm install --save-dev @types/react @types/react-router-dom @types/date-fns @types/node

COPY project/ .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"] 