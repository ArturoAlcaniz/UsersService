FROM arturoalcaniz/node-image:latest
COPY UsersService /app/UsersService
COPY entities-lib /app/entities-lib
COPY config-lib /app/config-lib
COPY certs /app/certs
EXPOSE 3022