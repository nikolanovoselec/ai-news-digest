/// <reference types="@cloudflare/vitest-pool-workers" />

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}

// Custom asset suffix handled by the `news-digest:raw-css` Vite plugin
// in vitest.config.ts. Returns the file contents as a raw string,
// bypassing Vite's CSS transform pipeline (which consumes `?raw` on
// `.css` files and leaves tests with an empty import).
declare module '*?raw-css' {
  const content: string;
  export default content;
}
