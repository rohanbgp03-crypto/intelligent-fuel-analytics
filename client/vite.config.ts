import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{rollupOptions:{output:{manualChunks:{charts:['recharts'],routing:['react-router-dom'],icons:['lucide-react']}}}},server:{port:Number(process.env.PORT||5173),allowedHosts:['terminal.local'],proxy:{'/api':'http://127.0.0.1:3001'}}});
