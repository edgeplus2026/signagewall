import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        // Main SPA + the dedicated MSAL popup redirect page (runs the redirect
        // bridge so OneDrive/SharePoint sign-in popups complete).
        main: path.resolve(__dirname, 'index.html'),
        msal: path.resolve(__dirname, 'msal.html'),
      },
    },
  },
})
