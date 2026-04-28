# Yell — Roadmap de Implementação

## Prioridades do Matheus (Ordem)

### 1. 🎨 Design Tokens → legível para agent
### 2. 📦 HTML minified output (renderer → browser)
### 3. 🔒 CSRF generator (forms protection)
### 4. 📜 JS dentro do index.html (compactado, sem deps externas)

---

## Fase 1 — Design Tokens

**O que é:** hoje os tokens são CSS custom properties escondidas no output. O goal é que o YAML de input declare tokens e o parser expanda pra CSS legível E pro agente conseguir ler/manipular.

**Estado atual:** tokens existem mas são processados no renderer sem schema formal

**O que fazer:**
- Criar `/packages/yell-core/src/tokens.ts` — parser de token definitions
- Adicionar no schema: `yell_tokens.yaml` com tipos (color, spacing, font, shadow, etc.)
- Exportar `TokenManifest` com todos os tokens resolved
- Tool para agent: `getTokenValue(tokenRef)` → retorna valor CSS
- Updates no playground pra mostrar token tree visualmente

**Arquivo novo:** `packages/yell-core/src/tokens.ts`

**Questão de design:**
```
# Input YAML
tokens:
  colors:
    primary: "#3B82F6"
    danger: "#EF4444"
  spacing:
    sm: "8px"
    md: "16px"

# Output CSS (minified)
:root{--color-primary:#3B82F6;--color-danger:#EF4444;--space-sm:8px;--space-md:16px}
```

---

## Fase 2 — HTML Minified Output

**O que é:** o renderer outputa HTMLpretty-printed. Pra produção, precisa minificar antes de enviar pro browser.

**Estado atual:** `renderToString()` retorna HTML com indentação

**O que fazer:**
- Adicionar `minify: true` flag em `SSRRenderOptions`
- Integrar `html-minifier` ou implementar regex-based minifier simples
- Minificar only no `production` mode (dev stays readable)
- Testar que hydration ainda funciona depois de minified

**Dependência:** Fase 1 (tokens precisam estar no CSS output antes de minificar)

**Arquivo novo:** `packages/yell-core/src/minify.ts`

---

## Fase 3 — CSRF Generator

**O que é:** Yell forms precisam de proteção CSRF. O generator cria tokens únicos por sessão/form e valida no hydration.

**Estado atual:** não existe

**O que fazer:**
- Criar `yell-security` package ou módulo dentro do core
- `generateCSRFToken()` — crypto random, 32 bytes, base64url encoded
- `CSRFMiddleware` — injeta token no form hidden field + cookie
- `validateCSRFToken(request)` — verifica token do form vs cookie
- Integrar no renderer: quando `form` component renderizado, auto-add hidden csrf field

**Arquivo novo:** `packages/yell-core/src/security/csrf.ts`

**Design decision:** tokens no cookie (httponly) ou localStorage? Cookie é mais seguro porque JS não acessa.

---

## Fase 4 — JS Compactado no index.html

**O que é:** todo o JS do playground (event handlers, diff, etc.) tá em `script.js` separado. Matheus quer que vá tudo pro `index.html` inline e minified.

**Estado atual:** `script.js` separado + `styles.css` separado

**O que fazer:**
- Minificar todo o JS inline no index.html (uglify ou terser)
- Minificar CSS inline (remove comments, whitespace, newline)
- Resultado: single `index.html` self-contained, sem network requests
- Manter versão de desenvolvimento legível Separada (`index.dev.html`)
- Build script: `npm run build:bundle` — produção
- Build script: `npm run build:dev` — desenvolvimento

**Arquivo novo:** `scripts/bundle.mjs` (build script)

---

## Prioridade de Execução

```
Semana 1-2: Fase 1 (Design Tokens)
Semana 3-4: Fase 2 (HTML Minified)  
Semana 5-6: Fase 3 (CSRF Generator)
Semana 7-8: Fase 4 (JS bundling)
```

**Por que começar pelos tokens?** Porque token resolution já tá no renderer — é a mudança mais natural e menos risk de quebrar o que existe. Os outros mudam fluxo de render e adding security layer.

---

## Issues GitHub a criar

- `design-tokens-parser` — parse and expand tokens
- `token-manifest-export` — expose resolved tokens to agents  
- `html-minifier` — production minification
- `csrf-generator` — form security
- `inline-js-bundle` — self-contained index.html

---

## Métricas de Sucesso

- [ ] Agent consegue ler token manifest e sugerir novos tokens
- [ ] HTML output < 50KB minified (sem assets externos)
- [ ] CSRF token validation em < 1ms
- [ ] index.html carrega em < 200ms em conexão lenta