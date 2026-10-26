# Sightbridge Advisor AI Demo — Agent Service

This repository is an isolated Sightbridge demo built from the reusable Agent Service base. It provides a document-grounded advisor Q&A API, the chat widget, and an admin console. It is an independent prototype by Jorge Vera, not an official Sightbridge site or investment product. The companion landing lives in the separate `landing` repository in the same organization.

The system gives general educational answers about Section 1031 real-estate exchanges, Delaware statutory trusts, and possible later Section 721 contributions. It does not assess an individual's transaction or recommend an investment. Its source and advice rules are in `agent-service/.env.example` and can be revised without changing the reusable base.

For the demo's scope decisions and planned next steps, see the [companion landing README](https://github.com/brunova-sightbridge-demo/landing#what-i-left-out-and-what-i-would-build-next). This README covers setup, authentication, operation, sources, and verification of Agent Service.

## Components

- `agent-service/`: FastAPI API for document upload, indexing, retrieval, answers, and access control.
- `chat-widget/`: React chat bubble and conversation panel.
- `console/`: dashboard, documents, people, chat history, and observability.
- `embedding-service/` and `llm-service/`: internal model services.
- PostgreSQL with pgvector and Redis for data, the ingestion queue, and optional conversation memory.

## Run locally

Use Docker Compose, Node.js 22.12 or newer, and a valid model API key. Copy `.env.example` to `.env`, `agent-service/.env.example` to `agent-service/.env`, and `console/.env.example` to `console/.env`. Set a unique database password and session secret, the Google web-client credentials, `OPENAI_API_KEY`, and a bootstrap-admin email. These local files are ignored by Git; never commit their values.

```bash
docker compose -p sightbridge-agent up -d --build
docker compose -p sightbridge-agent --profile worker up -d worker
npm ci --prefix console
npm run dev --prefix console -- --port 5176
```

The API listens at `http://localhost:8001` by default. `GET /ready` checks its dependencies. Run the companion landing on `http://localhost:8766` with its README instructions. Upload sources in the console with their public URL; the worker indexes them. The original stays available in the document detail to authorized console users.

## Deployed demo

The public landing is [sightbridge.brunova.mx](https://sightbridge.brunova.mx/), the authorized console is at [/console/](https://sightbridge.brunova.mx/console/), and the API is proxied under `/api/` on the same HTTPS origin. The Google web client must include `https://sightbridge.brunova.mx/api/auth/google/callback` as an authorized redirect. Build the console with `VITE_BASE_PATH=/console/` and `VITE_API_BASE=https://sightbridge.brunova.mx/api`; Nginx serves its static output while the API listens only on the VPS loopback interface.

Compose persists PostgreSQL and Redis in named volumes and mounts the private uploads directory described below. Back up the database volume and uploads together. Production secrets belong only in ignored `.env` files on the server, never in the static landing, console build, or Git.

### Uploaded files on the VPS

For this deployment, the private persistent host directory is `/var/lib/sightbridge-agent/uploads`. Set `UPLOADS_HOST_DIR` to that path in the root `.env` before starting Compose on the VPS. The API and ingestion worker mount the same directory at `/app/app/data/uploads`; local development keeps the existing repository-relative directory when the variable is unset. Back up this directory together with the application database, since document records refer to the stored originals.

Do not serve the directory from Nginx or make it publicly readable. The console retrieves originals through the authenticated `GET /admin/docs/{document_id}/file` API route; role checks apply before the file is returned. The console then renders a sandboxed preview or offers a download, according to file type. The current containers write as root, so the prepared host directory is owned by root with mode `0700`; revisit ownership if the containers move to a non-root user.

## Configure Google OIDC in a new project

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/) under the organization that will manage the application. In **Google Auth Platform → Branding**, set the user-facing application name, support email, and required contact details. Keep the reusable base neutrally branded; a client-specific deployment can use a separate web client in the same project.
2. Under **Audience**, choose **External** if accounts outside your organization need access. In **Testing**, Google limits sign-in to test users added there; adding someone in this application's People page does not replace that list. To let administrators authorize new external accounts solely from the application, review Google's publication requirements and move the OAuth app to **In production**. Brand or additional-scope approval may take time.
3. Under **Data access**, request only the identity scopes this application uses: `openid`, `email`, and `profile`. It does not need access to Gmail, Drive, or other Google data.
4. Under **Clients**, create an OAuth client of type **Web application**. Add `http://localhost:8001/auth/google/callback` as an authorized redirect for local development. `GOOGLE_OIDC_REDIRECT_URI` must match it exactly. For deployment, add the actual HTTPS redirect and update that variable. This demo has its own client, separate from the reusable base, within the same GCP project.
5. Store the client ID and secret in `agent-service/.env` as `GOOGLE_OIDC_CLIENT_ID` and `GOOGLE_OIDC_CLIENT_SECRET`. Set `OIDC_ENABLED=true`, a private random `OIDC_SESSION_SECRET`, and the initial administrator email in `OIDC_BOOTSTRAP_ADMINS`. On startup, that email enters the local access list; manage other accounts from **People**. Google verifies identity, while the application database assigns the role.
6. Set `OIDC_CHAT_URL`, `OIDC_CONSOLE_URL`, and `ALLOWED_ORIGINS` to the actual application URLs. Set `VITE_API_BASE` in `console/.env` to the API URL. In production, use HTTPS and `COOKIE_SECURE=true`. Serve the chat, console, and API under the same registrable site so the session cookie works with `SameSite=lax`.

The console and chat share one server-side session. Its cookie is `HttpOnly`; the browser does not store Google tokens in `localStorage`. The current configuration requests basic identity only. Consult the [official OAuth web-client guide](https://developers.google.com/identity/protocols/oauth2/web-server) and [audience and publication rules](https://support.google.com/cloud/answer/15549945?hl=en) if Google's interface or verification requirements change.

## Deployment settings

- `CHAT_LOGIN_REQUIRED=true` requires a session to use chat. The console always requires a session and a `viewer`, `curator`, or `admin` role.
- `CHAT_SHOW_CITATIONS=true` shows sources; `ANSWER_REQUIRE_SOURCES=true` withholds answers without sufficient evidence.
- `AGENT_SCOPE_POLICY` defines the allowed subject matter, and `AGENT_ADVICE_POLICY` describes personalized requests the assistant must decline. When empty, the reusable base adds no domain-specific limits.
- `AGENT_DISCLAIMER_ES` and `AGENT_DISCLAIMER_EN` customize the notice. The chat shows it within the expanded sources section only when an answer cites a source; greetings and answers without sources omit it.
- PDF, DOCX, TXT, Markdown, and HTML uploads accept an optional public HTTPS link. The link is retained as citation provenance. Verify each link and list the deployment's sources in its README.
- Each completed exchange stores the question, answer, sources, date, and verified email (or visitor in a public chat), regardless of the memory setting. Only administrators can read chat history. Optional memory changes the user's conversational context, not the administrative record.
- The console separates operational information from technical observability. Search passages are available inside each document's details.

Passage selection and answer checks use a model: they reject answers without found evidence but cannot guarantee perfect accuracy. Test real questions and review citations before delivering a deployment.

## Public source set

The `source-docs/` files are short **curated paraphrases** of public pages, each linked to its original. They are a deliberately small demo corpus, not official reproductions or current transaction guidance. Citations in the app point to the stored passage and link to the public original; verify the original before relying on an answer.

| Card | Public original |
| --- | --- |
| `01-irs-1031-real-estate.md` | [IRS: like-kind exchanges, real-estate tax tips](https://www.irs.gov/businesses/small-businesses-self-employed/like-kind-exchanges-real-estate-tax-tips) |
| `02-irs-8824-timing.md` | [IRS: Form 8824 instructions](https://www.irs.gov/instructions/i8824) |
| `03-irs-publication-544.md` | [IRS: Publication 544](https://www.irs.gov/publications/p544) |
| `04-irs-dst-ruling.md` | [IRS: Revenue Ruling 2004-86](https://www.irs.gov/irb/2004-33_IRB) |
| `05-irs-publication-541.md` | [IRS: Publication 541](https://www.irs.gov/publications/p541) |
| `06-sec-nontraded-reits.md` | [SEC Investor.gov: non-traded REIT bulletin](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-89) |
| `07-sightbridge-strategies.md` | [Sightbridge: public strategies](https://sightbridge.com/) |

The seven cards are loaded in the deployed demo and were verified ready in its admin console. A fresh installation needs them uploaded through the admin console with their public URLs; Git does not include a populated database or user records.

## Verification and delivery

```bash
npm run build --prefix chat-widget
npm run build --prefix console
make api-test
```

`make api-test` mounts the tests temporarily; the production image does not contain them. Before a delivery, test login, permissions, source uploads, cited answers, refusals, memory, and chat history. Document the sources, limits, deployed URL, and actual hours spent. Keep credentials, private documents, and user data out of the repository.
