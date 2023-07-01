# syntax = docker/dockerfile:1.0-experimental
FROM arturoalcaniz/node-image:latest
RUN --mount=type=secret,id=env \
    git clone "https://$(grep TOKEN_GIT /run/secrets/env | cut -d'=' -f 2-)@github.com/ArturoAlcaniz/UsersService.git" /app/UsersService/ && \
    git clone "https://$(grep TOKEN_GIT /run/secrets/env | cut -d'=' -f 2-)@github.com/ArturoAlcaniz/entities-lib.git" /app/entities-lib/ && \
    git clone "https://$(grep TOKEN_GIT /run/secrets/env | cut -d'=' -f 2-)@github.com/ArturoAlcaniz/config-lib.git" /app/config-lib/ && \
    git clone "https://$(grep TOKEN_GIT /run/secrets/env | cut -d'=' -f 2-)@github.com/ArturoAlcaniz/certs.git" /app/certs/
RUN chown -R node:node /app/UsersService /app/entities-lib /app/config-lib /app/certs
RUN chmod -R 755 /app/UsersService /app/entities-lib /app/config-lib /app/cers
USER node
EXPOSE 3022