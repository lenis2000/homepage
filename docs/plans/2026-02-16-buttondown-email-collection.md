# Buttondown Email Collection for Simulation Pages — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a non-intrusive email collection slide-in to simulation pages, powered by Buttondown with double opt-in, using localStorage to respect dismissals.

**Architecture:** A single Jekyll include (`_includes/email-signup.html`) containing self-contained HTML, CSS, and JS. It renders a bottom-right slide-in panel that appears after 10 seconds on simulation pages. Submissions POST to Buttondown's subscriber API. localStorage tracks whether the user has subscribed or dismissed, so the prompt only appears once.

**Tech Stack:** Vanilla JS, Buttondown API (CORS-friendly public subscribe endpoint), localStorage, Jekyll includes.

---

## Prerequisites (Manual)

Before implementation, the site owner must:

1. **Create a Buttondown account** at [buttondown.com](https://buttondown.com)
2. **Enable double opt-in** in Buttondown settings (Settings → Subscribers → require confirmation)
3. **Get the newsletter username** (e.g., `lpetrov`) — this is used in the API URL: `https://api.buttondown.com/v1/subscribers`
4. **Get the API key** — but we do NOT embed this in client-side code. Instead, Buttondown supports a **public subscribe endpoint** at: `https://buttondown.com/api/emails/embed-subscribe/<username>` which accepts unauthenticated POSTs

> **Important:** The public embed endpoint does NOT require an API key and is CORS-safe from any origin. This is the correct endpoint for static sites.

---

## Task 1: Create the Email Signup Include

**Files:**
- Create: `_includes/email-signup.html`

**Step 1: Create the include file**

This single file contains all HTML, CSS, and JS for the slide-in widget. It is fully self-contained with no external dependencies beyond what's already on the page (Bootstrap is available).

```html
<!-- Email signup slide-in for simulation pages -->
<div id="email-signup-overlay" style="display:none;">
  <div id="email-signup-panel">
    <button id="email-signup-close" type="button" aria-label="Close">&times;</button>
    <div id="email-signup-content">
      <h6 id="email-signup-title">Enjoying these simulations?</h6>
      <p id="email-signup-desc">Get notified when new interactive math simulations are published.</p>
      <form id="email-signup-form">
        <!-- Honeypot field — hidden from humans, bots fill it -->
        <div style="position:absolute;left:-9999px;" aria-hidden="true">
          <input type="text" name="hp_field" tabindex="-1" autocomplete="off">
        </div>
        <div class="input-group">
          <input type="email" name="email" class="form-control form-control-sm"
                 placeholder="your@email.com" required aria-label="Email address">
          <button type="submit" class="btn btn-sm btn-primary"
                  style="background-color:#232D4B;border-color:#232D4B;">
            Subscribe
          </button>
        </div>
      </form>
      <div id="email-signup-msg" style="display:none;margin-top:0.5rem;font-size:0.85rem;"></div>
    </div>
    <button id="email-signup-skip" type="button">No thanks</button>
  </div>
</div>

<style>
  #email-signup-overlay {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 1060; /* above Bootstrap modals */
    max-width: 360px;
    width: calc(100% - 2rem);
    font-family: inherit;
  }
  #email-signup-panel {
    background: #fff;
    border: 1px solid #dee2e6;
    border-radius: 0.75rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    padding: 1.25rem;
    position: relative;
    animation: emailSlideIn 0.4s ease-out;
  }
  @keyframes emailSlideIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  #email-signup-close {
    position: absolute;
    top: 0.5rem;
    right: 0.75rem;
    background: none;
    border: none;
    font-size: 1.25rem;
    line-height: 1;
    color: #6c757d;
    cursor: pointer;
    padding: 0;
  }
  #email-signup-close:hover { color: #000; }
  #email-signup-title {
    margin: 0 0 0.35rem 0;
    font-weight: 600;
    color: #232D4B;
  }
  #email-signup-desc {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    color: #555;
  }
  #email-signup-skip {
    display: block;
    margin: 0.5rem auto 0;
    background: none;
    border: none;
    color: #6c757d;
    font-size: 0.8rem;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
  }
  #email-signup-skip:hover { color: #333; }

  /* Dark mode */
  [data-theme="dark"] #email-signup-panel {
    background: var(--bg-secondary, #1e1e1e);
    border-color: var(--border-color, #444);
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }
  [data-theme="dark"] #email-signup-title {
    color: var(--text-primary, #e0e0e0);
  }
  [data-theme="dark"] #email-signup-desc {
    color: var(--text-secondary, #aaa);
  }
  [data-theme="dark"] #email-signup-close { color: #999; }
  [data-theme="dark"] #email-signup-close:hover { color: #fff; }
  [data-theme="dark"] #email-signup-skip { color: #999; }
  [data-theme="dark"] #email-signup-skip:hover { color: #ccc; }

  /* Mobile: full-width bar at bottom */
  @media (max-width: 576px) {
    #email-signup-overlay {
      bottom: 0;
      right: 0;
      max-width: 100%;
      width: 100%;
    }
    #email-signup-panel {
      border-radius: 0.75rem 0.75rem 0 0;
    }
  }
</style>

<script>
(function() {
  var STORAGE_KEY = 'sim-email-signup';
  var DELAY_MS = 10000; // 10 seconds
  // CONFIGURE: Replace with your Buttondown username
  var BUTTONDOWN_USERNAME = 'REPLACE_WITH_USERNAME';

  // Don't show if already subscribed or dismissed
  var status = localStorage.getItem(STORAGE_KEY);
  if (status === 'subscribed' || status === 'dismissed') return;

  var timer = setTimeout(function() {
    var overlay = document.getElementById('email-signup-overlay');
    if (overlay) overlay.style.display = 'block';
  }, DELAY_MS);

  // Close / Skip handlers
  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'dismissed');
    var overlay = document.getElementById('email-signup-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', function() {
    var closeBtn = document.getElementById('email-signup-close');
    var skipBtn = document.getElementById('email-signup-skip');
    var form = document.getElementById('email-signup-form');
    var msg = document.getElementById('email-signup-msg');

    if (closeBtn) closeBtn.addEventListener('click', dismiss);
    if (skipBtn) skipBtn.addEventListener('click', dismiss);

    if (form) form.addEventListener('submit', function(e) {
      e.preventDefault();
      // Check honeypot
      var hp = form.querySelector('input[name="hp_field"]');
      if (hp && hp.value) return; // bot detected

      var emailInput = form.querySelector('input[name="email"]');
      var email = emailInput ? emailInput.value.trim() : '';
      if (!email) return;

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '...'; }

      fetch('https://buttondown.com/api/emails/embed-subscribe/' + BUTTONDOWN_USERNAME, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      })
      .then(function(resp) {
        if (resp.ok || resp.status === 201) {
          localStorage.setItem(STORAGE_KEY, 'subscribed');
          if (msg) {
            msg.style.display = 'block';
            msg.style.color = '#198754';
            msg.textContent = 'Check your inbox to confirm!';
          }
          form.style.display = 'none';
          var skip = document.getElementById('email-signup-skip');
          if (skip) skip.style.display = 'none';
          // Auto-hide after 3 seconds
          setTimeout(function() {
            var overlay = document.getElementById('email-signup-overlay');
            if (overlay) overlay.style.display = 'none';
          }, 3000);
        } else {
          throw new Error('Status ' + resp.status);
        }
      })
      .catch(function() {
        if (msg) {
          msg.style.display = 'block';
          msg.style.color = '#dc3545';
          msg.textContent = 'Something went wrong. Try again?';
        }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Subscribe'; }
      });
    });
  });
})();
</script>
```

**Step 2: Commit**

```bash
git add _includes/email-signup.html
git commit -m "Add email signup slide-in include for simulation pages"
```

---

## Task 2: Add Include to Simulation Page Layout

**Files:**
- Modify: `_layouts/sim_page.html:132-134`

**Step 1: Add the include**

Insert `{% include email-signup.html %}` just before the closing `</body>` tag, after the existing includes:

```html
        {% include nsf-grant-footer.html %}
        {% include footer.html %} {% include boot.js %} {% include math.js %} {%
        include google.js %}
        {% include email-signup.html %}
    </body>
```

**Step 2: Commit**

```bash
git add _layouts/sim_page.html
git commit -m "Add email signup include to simulation page layout"
```

---

## Task 3: Add Include to Simulations Index Page

**Files:**
- Modify: `simulations.md` (append before closing `</div>`)

**Step 1: Add the include**

Append after the `</style>` block, before the final `</div>`:

```html
</style>

{% include email-signup.html %}

</div><!-- /.container -->
```

> Note: The simulations index uses the `default` layout. We add the include inside the page content rather than modifying `default.html`, since `default.html` is shared by non-simulation pages.

**Step 2: Commit**

```bash
git add simulations.md
git commit -m "Add email signup include to simulations index page"
```

---

## Task 4: Configure Buttondown Username

**Files:**
- Modify: `_includes/email-signup.html`

**Step 1: Replace placeholder**

Once the Buttondown account is created, replace:
```js
var BUTTONDOWN_USERNAME = 'REPLACE_WITH_USERNAME';
```
with the actual username.

**Step 2: Commit**

```bash
git add _includes/email-signup.html
git commit -m "Configure Buttondown username for email signup"
```

---

## Task 5: Test and Verify

**Step 1: Run Jekyll locally and verify**

1. Open `/simulations/` — widget should slide in from bottom-right after 10 seconds
2. Click "No thanks" — widget disappears, refresh page — widget does NOT reappear
3. Clear localStorage (`localStorage.removeItem('sim-email-signup')`) — widget reappears on next page load
4. Open any individual simulation page — same behavior
5. Open a non-simulation page (e.g., `/research/`) — widget should NOT appear
6. Test on mobile viewport — widget should be full-width at bottom
7. Test dark mode — colors should adapt
8. Submit with a real email — should get Buttondown confirmation email
9. Inspect the honeypot: verify the hidden field is not visible, then test that submitting with it filled does nothing

**Step 2: Verify Buttondown dashboard**

1. Check that the test email appears as "unconfirmed" in Buttondown
2. Click the confirmation link in the email
3. Verify status changes to "confirmed" in Buttondown

**Step 3: Commit any fixes and deploy**

```bash
git push
```

---

## Summary of Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `_includes/email-signup.html` | Create | Self-contained slide-in widget (HTML + CSS + JS) |
| `_layouts/sim_page.html` | Modify (1 line) | Include widget on all individual simulation pages |
| `simulations.md` | Modify (1 line) | Include widget on the simulations index page |

## Notes

- **No API key exposed** — uses Buttondown's public embed-subscribe endpoint
- **No external JS dependencies** — vanilla JS, uses existing Bootstrap classes for input styling
- **Single localStorage key** (`sim-email-signup`) — shared across all simulation pages, so dismissing on one page dismisses everywhere
- **Double opt-in** handled by Buttondown — unconfirmed emails never become subscribers
- **Honeypot field** blocks naive bots without requiring a CAPTCHA
- **Graceful degradation** — if JS fails or Buttondown is down, nothing breaks; the widget simply doesn't appear
