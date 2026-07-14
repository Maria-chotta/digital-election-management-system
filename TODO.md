# TODO - Admin-only Election Results

- [x] Locate results endpoints and frontend results button
- [x] Update REST API `/api/results/<election_id>/` to require admin/staff
- [x] Hide/disable “View Results” button in static frontend for non-admin users
- [x] Frontend gate in static JS to block non-admin from loading results
- [x] Verify in frontend: non-admin cannot open/load results UI and results fetch is blocked
- [ ] Verify backend enforcement: non-admin receives 403 on `/api/results/<id>/` and admin receives 200


