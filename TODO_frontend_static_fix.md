# Frontend static + JS fix - progress tracker

- [x] Inspect templates and static JS presence
- [x] Replaced `frontend/static/frontend/script.js` with corrected version (JWT auth + modals + elections/vote)
- [x] Replaced `frontend/templates/frontend/index.html` to ensure it loads `{% static 'frontend/script.js' %}` and uses modal IDs matching JS
- [x] Fixed broken `openLogin/openRegister` wiring by ensuring those functions exist in loaded static JS
- [x] Fixed duplicate `id="authMessage"` by ensuring a single message element is used consistently
- [ ] Next: audit remaining templates for JS/static path mismatches and missing required DOM IDs
- [ ] Next: update `frontend/templates/frontend/results.html` to not rely on hardcoded placeholders and to handle API response errors safely
- [ ] Next: verify `frontend/templates/frontend/login.html` is consistent with endpoints + token storage + redirects
- [ ] Next: run Django dev server and confirm no console errors and no 404 for static files

