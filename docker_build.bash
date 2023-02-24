docker build -t arturoalcaniz/users-service:latest -t arturoalcaniz/users-service:$(npm pkg get version | tr -d '"') -f Dockerfile ..
if [ "$1" ]
  then
    printf $1 | docker login --username arturoalcaniz --password-stdin
fi
docker push arturoalcaniz/users-service:$(npm pkg get version | tr -d '"')
docker push arturoalcaniz/users-service:latest
