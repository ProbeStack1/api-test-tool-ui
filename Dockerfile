# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./

ENV CI=false

RUN --mount=type=secret,id=google_artifact_token \
    export GOOGLE_ARTIFACT_TOKEN="$(cat /run/secrets/google_artifact_token)" && npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
