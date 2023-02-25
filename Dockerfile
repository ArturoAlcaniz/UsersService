# syntax = docker/dockerfile:1.0-experimental
FROM arturoalcaniz/node-image:latest
RUN --mount=type=secret,id=env \
    git clone "https://${TOKEN_GIT}@github.com/ArturoAlcaniz/UsersService.git" /app/UsersService/
EXPOSE 3022