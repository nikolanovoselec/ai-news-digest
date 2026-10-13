// Build-time bridge for REQ-PWA-001. The published Astro PWA wrapper only
// supports Astro 1-5; use the supported Vite PWA API with Astro's client
// environment and generate the service worker after all assets are written.
import { fileURLToPath } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';

export default function pwaIntegration(options) {
  let api;
  return {
    name: 'news-digest:pwa',
    hooks: {
      'astro:config:setup': ({ command, config, updateConfig }) => {
        if (command !== 'build') return;
        const clientDir = fileURLToPath(config.build.client);
        const plugins = VitePWA({
          ...options,
          base: config.base,
          outDir: clientDir,
          injectRegister: 'script',
          includeManifestIcons: false,
          workbox: {
            ...options.workbox,
            globDirectory: clientDir,
            dontCacheBustURLsMatching: new RegExp(config.build.assets),
          },
        }).filter((plugin) => ![
          'vite-plugin-pwa:build',
          'vite-plugin-pwa:dev-sw',
        ].includes(plugin.name));
        api = plugins.find((plugin) => plugin.name === 'vite-plugin-pwa').api;
        updateConfig({
          vite: {
            plugins: [...plugins, {
              name: 'news-digest:pwa-client',
              applyToEnvironment(environment) {
                return environment.name === 'client';
              },
              generateBundle(_options, bundle) {
                api.generateBundle(bundle, this);
              },
            }],
          },
        });
      },
      'astro:build:done': async () => {
        if (api && !api.disabled) await api.generateSW();
      },
    },
  };
}
