FROM arturoalcaniz/node-image:latest
RUN --mount=type=secret,id=my_env source /run/secrets/my_env && \
    git clone https://${TOKEN_GIT}@github.com/ArturoAlcaniz/UsersService.git /app/UsersService/ && \
    git clone https://${TOKEN_GIT}@github.com/ArturoAlcaniz/entities-lib.git /app/entities-lib/ && \
    git clone https://${TOKEN_GIT}@github.com/ArturoAlcaniz/config-lib.git /app/config-lib/ && \
    git clone https://${TOKEN_GIT}@github.com/ArturoAlcaniz/certs.git /app/certs/
EXPOSE 3022