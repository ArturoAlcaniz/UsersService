FROM arturoalcaniz/node-image:latest
RUN apt-get update
RUN apt-get install git -y
RUN git clone https://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@github.com/ArturoAlcaniz/UsersService.git /app/
RUN git clone https://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@github.com/ArturoAlcaniz/entities-lib.git /app/
RUN git clone https://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@github.com/ArturoAlcaniz/config-lib.git /app/
RUN git clone https://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@github.com/ArturoAlcaniz/certs.git /app/
COPY /app/UsersService/.dockerignore /app/.dockerignore
EXPOSE 3022