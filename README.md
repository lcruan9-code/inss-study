# INSS Study

Snapshot de recuperação da versão publicada em https://inss-study.vercel.app/.

## Estado desta recuperação

Este repositório preserva os recursos estáticos recuperados da implantação principal da Vercel: HTML inicial, CSS, runtime do Next.js e bundles compilados da aplicação.

**Importante:** os arquivos JavaScript em `_next/static/chunks/` são artefatos compilados/minificados, não os fontes React originais. A API de recuperação da implantação não disponibilizou integralmente o fonte original nem os source maps. Esta cópia é um snapshot de produção recuperado, ainda não uma árvore-fonte de desenvolvimento.

## Origem

- Projeto Vercel: `inss-study`
- Domínio de produção: https://inss-study.vercel.app/
- Deployment: `dpl_APq6FTbT4LZ4qYTsfzB8Ln7pdU6g`
- Build ID: `46dZ5dJKeQqQ4lslGaHLA`
- Next.js: 15.5.29
- React: 19.1.1
- Supabase JS: 2.57.4

## Configuração Supabase

A aplicação utiliza estas variáveis públicas:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Configure-as diretamente na Vercel. Nenhuma credencial privada ou arquivo `.env` foi incluído.

## Funcionalidades identificadas na publicação

- Autenticação com Supabase.
- Painel interno e acompanhamento de progresso.
- Cronograma e calendário de 12 semanas.
- Aulas, disciplinas e tópicos do edital.
- Registro de progresso por aula.
- Questões de treino, correção, explicação e histórico.

## Próximas etapas

1. Recuperar ou reconstituir os módulos React de desenvolvimento.
2. Recriar a estrutura do projeto Next.js.
3. Validar autenticação, progresso, aulas e questões em preview.
4. Conectar o projeto Vercel a este repositório somente depois de validar a árvore-fonte.

Este snapshot não altera o projeto Vercel nem os dados do Supabase.
