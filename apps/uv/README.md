# UV

Builds a base python docker image with uv, a lightweight way to host simple python applications without building an image for each

`docker build -t ghcr.io/craigedmunds/uv .`

`docker run --rm --name uv-sample -p 8080:8080 -v $(pwd)/example:/app ghcr.io/craigedmunds/uv`

`docker push ghcr.io/craigedmunds/uv`