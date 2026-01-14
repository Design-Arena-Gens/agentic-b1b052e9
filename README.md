## VoxTube — Agente de Voz para YouTube

VoxTube é um assistente web que conecta reconhecimento de voz, busca inteligente e narração sintetizada para explorar vídeos do YouTube sem usar o teclado.

### ✨ Funcionalidades principais
- Comandos por voz em português (fallback para entrada por texto).
- Respostas em voz com resumos naturais dos principais vídeos encontrados.
- Cartões ricos com duração, data de publicação, visualizações e descrição.
- Painel lateral com destaque do vídeo selecionado e atalho direto ao YouTube.
- Histórico da conversa para acompanhar pedidos anteriores.

### 🧰 Tecnologias
- [Next.js 14 (App Router)](https://nextjs.org)
- [React](https://react.dev) com componentes client-side
- [Tailwind CSS](https://tailwindcss.com) com design em glassmorphism
- [Web Speech API](https://developer.mozilla.org/docs/Web/API/Web_Speech_API) (speech recognition + synthesis)
- [`youtube-search-without-api-key`](https://www.npmjs.com/package/youtube-search-without-api-key) + [`ytdl-core`](https://www.npmjs.com/package/ytdl-core) para enriquecer metadados

### 🚀 Executando localmente
```bash
npm install
npm run dev
# app disponível em http://localhost:3000
```

### 📦 Build de produção
```bash
npm run build
npm start
```

> **Observação:** o reconhecimento de voz depende de HTTPS e do suporte do navegador (Chrome/Edge). Em navegadores sem suporte, utilize a caixa de texto.

### 🛡️ Permissões
- Certifique-se de liberar o acesso ao microfone na primeira execução.
- A síntese de voz usa o mecanismo nativo do navegador; ajuste o volume no seu sistema se necessário.
