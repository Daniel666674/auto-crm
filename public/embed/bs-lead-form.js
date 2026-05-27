/**
 * BlackScale Nexus — Lead Capture Widget
 * Drop-in form that sends leads directly to the CRM webhook.
 *
 * Usage (paste anywhere on your website):
 * ─────────────────────────────────────────────────────────────────────────
 * <div id="bs-lead-form"></div>
 * <script
 *   src="https://nexus.blackscale.consulting/embed/bs-lead-form.js"
 *   data-target="bs-lead-form"
 *   data-source="website"
 *   data-lang="es"
 *   data-secret=""
 *   data-theme="dark"
 * ></script>
 * ─────────────────────────────────────────────────────────────────────────
 *
 * data-target    — id of the container div  (default: "bs-lead-form")
 * data-source    — value stored in CRM contact.source  (default: "website")
 * data-lang      — "es" (default) or "en"
 * data-secret    — webhook secret if you enabled one in CRM settings
 * data-theme     — "dark" (default) or "light"
 * data-title     — custom heading text
 * data-btn       — custom submit button text
 * data-success   — custom success message
 */
(function () {
  "use strict";

  const WEBHOOK = "https://nexus.blackscale.consulting/api/webhook";

  /* ── find the script tag so we can read data-* attributes ── */
  const script =
    document.currentScript ||
    (function () {
      const tags = document.getElementsByTagName("script");
      return tags[tags.length - 1];
    })();

  const cfg = {
    target:  script.getAttribute("data-target")  || "bs-lead-form",
    source:  script.getAttribute("data-source")  || "website",
    lang:    script.getAttribute("data-lang")    || "es",
    secret:  script.getAttribute("data-secret")  || "",
    theme:   script.getAttribute("data-theme")   || "dark",
    title:   script.getAttribute("data-title")   || null,
    btn:     script.getAttribute("data-btn")      || null,
    success: script.getAttribute("data-success") || null,
  };

  /* ── i18n ── */
  const T = {
    es: {
      title:    cfg.title   || "¿Listo para escalar?",
      name:     "Nombre completo *",
      email:    "Email",
      phone:    "WhatsApp / Teléfono",
      company:  "Empresa",
      message:  "¿En qué te podemos ayudar?",
      btn:      cfg.btn     || "Solicitar información",
      sending:  "Enviando…",
      success:  cfg.success || "¡Recibido! Te contactaremos pronto.",
      errName:  "Por favor ingresa tu nombre.",
      errSend:  "Hubo un error al enviar. Intenta de nuevo.",
    },
    en: {
      title:    cfg.title   || "Ready to scale?",
      name:     "Full name *",
      email:    "Email",
      phone:    "WhatsApp / Phone",
      company:  "Company",
      message:  "How can we help?",
      btn:      cfg.btn     || "Get in touch",
      sending:  "Sending…",
      success:  cfg.success || "Got it! We'll be in touch soon.",
      errName:  "Please enter your name.",
      errSend:  "Something went wrong. Please try again.",
    },
  };
  const t = T[cfg.lang] || T.es;

  /* ── styles (injected once) ── */
  const STYLE_ID = "bs-lead-form-styles";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .bs-form-wrap { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .bs-form-wrap *, .bs-form-wrap *::before, .bs-form-wrap *::after { box-sizing: inherit; }
      .bs-form-wrap.dark  { --bg:#111; --border:#2a2a2a; --text:#e2e8f0; --muted:#718096; --btn:#C39A4C; --btn-text:#000; --inp-bg:#1a1a1a; }
      .bs-form-wrap.light { --bg:#fff; --border:#e2e8f0; --text:#1a202c; --muted:#718096; --btn:#C39A4C; --btn-text:#000; --inp-bg:#f7fafc; }
      .bs-form-wrap { background:var(--bg); border:1px solid var(--border); border-radius:14px; padding:28px 28px 24px; max-width:480px; }
      .bs-form-title { font-size:20px; font-weight:700; color:var(--text); margin:0 0 20px; }
      .bs-form-group { margin-bottom:14px; }
      .bs-form-group label { display:block; font-size:11px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin-bottom:5px; }
      .bs-form-group input,
      .bs-form-group textarea { width:100%; background:var(--inp-bg); border:1px solid var(--border); border-radius:8px; padding:10px 12px; font-size:14px; color:var(--text); outline:none; transition:border-color .15s; }
      .bs-form-group input:focus,
      .bs-form-group textarea:focus { border-color:var(--btn); }
      .bs-form-group textarea { resize:vertical; min-height:80px; }
      .bs-form-group input::placeholder,
      .bs-form-group textarea::placeholder { color:var(--muted); opacity:.6; }
      /* honeypot — must stay invisible */
      .bs-form-hp { position:absolute; left:-9999px; opacity:0; pointer-events:none; }
      .bs-form-btn { width:100%; margin-top:6px; padding:12px; background:var(--btn); color:var(--btn-text); border:none; border-radius:8px; font-size:15px; font-weight:700; cursor:pointer; letter-spacing:.02em; transition:opacity .15s; }
      .bs-form-btn:disabled { opacity:.6; cursor:not-allowed; }
      .bs-form-btn:not(:disabled):hover { opacity:.88; }
      .bs-form-error { color:#f87171; font-size:12px; margin-top:4px; }
      .bs-form-success { text-align:center; padding:32px 16px; }
      .bs-form-success-icon { font-size:40px; margin-bottom:12px; }
      .bs-form-success-msg { font-size:16px; font-weight:600; color:var(--text); }
    `;
    document.head.appendChild(style);
  }

  /* ── build form HTML ── */
  function buildForm() {
    return `
      <p class="bs-form-title">${t.title}</p>
      <form id="bs-lf-form" novalidate autocomplete="on">

        <!-- honeypot — bots fill this; humans don't see it -->
        <div class="bs-form-hp" aria-hidden="true">
          <input name="_honey" tabindex="-1" autocomplete="off" value="">
          <input name="website_url" tabindex="-1" autocomplete="off" value="">
        </div>

        <div class="bs-form-group">
          <label for="bs-lf-name">${t.name}</label>
          <input id="bs-lf-name" name="name" type="text" autocomplete="name" placeholder="e.g. María García">
          <div class="bs-form-error" id="bs-lf-name-err" style="display:none">${t.errName}</div>
        </div>

        <div class="bs-form-group">
          <label for="bs-lf-email">${t.email}</label>
          <input id="bs-lf-email" name="email" type="email" autocomplete="email" placeholder="tu@empresa.com">
        </div>

        <div class="bs-form-group">
          <label for="bs-lf-phone">${t.phone}</label>
          <input id="bs-lf-phone" name="phone" type="tel" autocomplete="tel" placeholder="+57 300 000 0000">
        </div>

        <div class="bs-form-group">
          <label for="bs-lf-company">${t.company}</label>
          <input id="bs-lf-company" name="company" type="text" autocomplete="organization" placeholder="">
        </div>

        <div class="bs-form-group">
          <label for="bs-lf-msg">${t.message}</label>
          <textarea id="bs-lf-msg" name="message" placeholder=""></textarea>
        </div>

        <div class="bs-form-error" id="bs-lf-send-err" style="display:none">${t.errSend}</div>
        <button class="bs-form-btn" type="submit" id="bs-lf-btn">${t.btn}</button>
      </form>
    `;
  }

  function showSuccess(wrap) {
    wrap.innerHTML = `
      <div class="bs-form-success">
        <div class="bs-form-success-icon">✓</div>
        <div class="bs-form-success-msg">${t.success}</div>
      </div>
    `;
  }

  /* ── UTM capture from current page URL ── */
  function getUtm() {
    try {
      const p = new URLSearchParams(window.location.search);
      return {
        utm_source:   p.get("utm_source")   || "",
        utm_medium:   p.get("utm_medium")   || "",
        utm_campaign: p.get("utm_campaign") || "",
      };
    } catch {
      return {};
    }
  }

  /* ── mount ── */
  function mount() {
    const container = document.getElementById(cfg.target);
    if (!container) {
      console.warn("[BSLeadForm] Container #" + cfg.target + " not found.");
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "bs-form-wrap " + cfg.theme;
    wrap.innerHTML = buildForm();
    container.appendChild(wrap);

    const form    = wrap.querySelector("#bs-lf-form");
    const btn     = wrap.querySelector("#bs-lf-btn");
    const nameErr = wrap.querySelector("#bs-lf-name-err");
    const sendErr = wrap.querySelector("#bs-lf-send-err");

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      /* validation */
      nameErr.style.display = "none";
      sendErr.style.display = "none";
      const nameVal = (form.elements.name.value || "").trim();
      if (!nameVal) {
        nameErr.style.display = "block";
        form.elements.name.focus();
        return;
      }

      btn.disabled    = true;
      btn.textContent = t.sending;

      const utm  = getUtm();
      const body = {
        name:    nameVal,
        email:   (form.elements.email.value   || "").trim(),
        phone:   (form.elements.phone.value   || "").trim(),
        company: (form.elements.company.value || "").trim(),
        message: (form.elements.message.value || "").trim(),
        source:  cfg.source,
        /* honeypot values (empty for humans) */
        _honey:      form.elements._honey.value,
        website_url: form.elements.website_url.value,
        /* UTM */
        ...utm,
      };

      try {
        const headers = { "Content-Type": "application/json" };
        if (cfg.secret) headers["x-webhook-secret"] = cfg.secret;

        const res = await fetch(WEBHOOK, {
          method:  "POST",
          headers,
          body:    JSON.stringify(body),
        });

        if (res.ok) {
          showSuccess(wrap);
        } else {
          throw new Error("status " + res.status);
        }
      } catch (err) {
        console.error("[BSLeadForm]", err);
        sendErr.style.display = "block";
        btn.disabled    = false;
        btn.textContent = t.btn;
      }
    });
  }

  /* ── wait for DOM ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
