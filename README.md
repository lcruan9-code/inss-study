# INSS Study

Aplicação Next.js que preserva a interface de produção recuperada da Vercel e aplica melhorias de experiência sem reimplementar nem alterar o banco Supabase.

## Estrutura de recuperação

- `src/pages/index.js`: host da interface recuperada, em iframe da mesma origem.
- `src/public/original/index.html`: HTML inicial da versão de produção.
- `src/public/original-next/static/`: bundles JS, CSS e manifestos originais.
- `src/public/inss-study-enhancements.css`: tema escuro, tipografia, largura e modos de vídeo.
- `src/public/inss-study-enhancements.js`: alternância de tema e controles do player.

Os bundles do Next.js da versão anterior foram preservados como artefatos compilados. Ainda não são os fontes React originais. O wrapper permite manter os fluxos existentes enquanto os componentes originais são recuperados/reconstruídos.

## Melhorias incluídas

- Tema escuro padrão, com alternância para tema claro e preferência no navegador.
- Tipografia ampliada e maior área útil em monitores largos.
- Controles no player: ampliar vídeo, modo teatro e tela cheia.
- Layout responsivo para telas menores.

## Supabase

A autenticação, o catálogo de aulas, o progresso e as tentativas de questões continuam sendo controlados pela aplicação publicada original. Nenhuma migração ou alteração de tabela foi executada.

Configure na Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Não inclua arquivo `.env`, service-role key ou credenciais privadas no Git.
