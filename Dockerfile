FROM denoland/deno:2.8.0

WORKDIR /app

COPY . .

RUN deno cache ./src/main.ts

CMD ["deno", "run", "-A", "./src/main.ts"]