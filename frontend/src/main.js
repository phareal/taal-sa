import "../assets/css/main.css";
import { route, start } from "./router.js";
import { renderShell, pageRoot } from "./layout.js";

import { renderHome }            from "./pages/home.js";
import { renderConnaissements }  from "./pages/connaissements.js";
import { renderClients }         from "./pages/clients.js";
import { renderShippers }        from "./pages/shippers.js";
import { renderCotations }       from "./pages/cotations.js";
import { renderProspects }       from "./pages/prospects.js";
import { renderGroupage }        from "./pages/groupage.js";
import { renderRH }              from "./pages/rh.js";
import { renderComptabilite }    from "./pages/comptabilite.js";
import { renderAudit }           from "./pages/audit.js";
import { renderImport }          from "./pages/import.js";

// Wrap each handler so the shell (sidebar + header) renders first,
// then the page handler populates #page-content.
function page(handler) {
  return async () => {
    renderShell();
    return handler(pageRoot());
  };
}

route("/",               page(renderHome));
route("/connaissements", page(renderConnaissements));
route("/clients",        page(renderClients));
route("/shippers",       page(renderShippers));
route("/cotations",      page(renderCotations));
route("/prospects",      page(renderProspects));
route("/groupage",       page(renderGroupage));
route("/rh",             page(renderRH));
route("/comptabilite",   page(renderComptabilite));
route("/audit",          page(renderAudit));
route("/import",         page(renderImport));

route("*", page(async (root) => {
  root.innerHTML = `
    <div class="app-card">
      <div class="section-title">404 — Page introuvable</div>
      <p style="color:var(--text2);">La ressource demandée n'existe pas.</p>
      <a href="/" data-link class="btn-primary" style="display:inline-block; margin-top:16px;">Retour à l'accueil</a>
    </div>`;
}));

start();
