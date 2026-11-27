import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ command }) => {
  // Vercel builds at the domain root into dist/; GitHub Pages serves from
  // /DayTrackV4/ and commits the build into docs/.
  const isVercel = Boolean(process.env.VERCEL);
  return {
    // GitHub Pages project site is served from /DayTrackV4/. Keep dev at root.
    base: command === 'build' ? (isVercel ? '/' : '/DayTrackV4/') : '/',
    define:
      command === 'build'
        ? {
            'import.meta.env.VITE_GEMINI_API_KEY': 'undefined',
            'import.meta.env.VITE_GEMINI_API_KEYS': 'undefined',
          }
        : {},
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/apple-touch-icon.png'],
        manifest: {
          name: 'DayTrack',
          short_name: 'DayTrack',
          description:
            'Organize schedules, manage tasks, and boost focus with AI-driven insights.',
          lang: 'vi',
          theme_color: '#12263F',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
      }),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    build: {
      outDir: isVercel ? 'dist' : 'docs',
      emptyOutDir: true,
    },
  };
})
