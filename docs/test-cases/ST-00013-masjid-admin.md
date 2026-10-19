# ST-00013 — Masjid admin: cards, approval highlight, admin email, contacts, toasts

Customer asks: masjid cards in the back office; highlight masjids waiting for approval on the dashboard;
admin should get an email when a masjid is added; WhatsApp group link, Google Maps link, Muazzin and Imam
contacts; back-office messages as SweetAlert toasts.

Decisions: cards with a table toggle; email to the admin on a new submission; Imam/Muazzin phones visible
to signed-in app users only; toasts across the whole back office.

## Automated tests

| Spec | Cases |
|---|---|
| `backoffice/src/app/community/masjid-list.component.spec.ts` — cards/table, `?status=pending`, approve/delete toasts | 10 |
| `backoffice/src/app/dashboard/dashboard.pending-masjids.spec.ts` — approval highlight and one-click approve | 5 |
| `frontend/src/app/components/community/masjid/masjid.component.spec.ts` — contact fields, validation, hidden phones | 10 |
| Server link/phone rules (`MasjidDetail` patterns, incl. lookalike domains) — checked with a PHP script | 19 |

## Manual test cases

### A. Database
| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| A1 | Positive | Run `database/2026-10-19_masjid_contacts_and_links.sql` | 6 new nullable columns on `bt_masjid_detail`; migration row added | |
| A2 | Negative | Run it again | No error, nothing duplicated | |

### B. Admin email on a new masjid
| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| B1 | Positive | Add a masjid in the app | contact@salah-times.in gets "New masjid waiting for approval: <name>" with details and a "Review and approve" link | |
| B2 | Positive | Reply to that email | Reply goes to the user who added the masjid | |
| B3 | Negative | Edit an existing masjid | No email | |
| B4 | Negative | Mail server down | Masjid still saves (email failure is only logged) | |

### C. Dashboard
| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| C1 | Positive | Pending masjids exist | Orange card at the top: "N masjids are waiting for approval", oldest first, up to 5 | |
| C2 | Positive | Click **Approve** on a row | Toast "Masjid approved.", row disappears, counts update without a full reload | |
| C3 | Positive | Click **View all** | Masjid list opens filtered to "Waiting for approval" | |
| C4 | Positive | Masjids stat card | Shows "N waiting for approval" in red while any are pending | |
| C5 | Negative | No pending masjids | No highlight card; stat card shows "N active" | |
| C6 | Negative | Recent masjids panel with a pending masjid | Shows "Waiting for approval", not "Inactive" | |

### D. Masjid list cards
| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| D1 | Positive | Open Community › Masjids | Cards with photo (or icon), status badge, location, madhab, timings, owner | |
| D2 | Positive | Switch to table and reload | Table view is remembered | |
| D3 | Positive | Approve / activate / delete from a card | Toast confirms; list refreshes | |
| D4 | Negative | Masjid without photos | Icon placeholder, no broken image | |
| D5 | Negative | Phone width | Cards stack one per row, no horizontal scroll | |

### E. Contacts and links
| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| E1 | Positive | App: edit masjid, fill WhatsApp, Maps, Imam, Muazzin, Save | Saved; details page shows "Join WhatsApp group", "Open in Google Maps", Imam and Muazzin with call buttons | |
| E2 | Positive | Back office: masjid › Edit › Links & people | Same fields, saved and shown | |
| E3 | Positive | Signed out, open the masjid page | Names and links shown; phones hidden with "Sign in to see the phone numbers." | |
| E4 | Positive | Signed in | Phones shown; tapping one opens the dialer | |
| E5 | Negative | WhatsApp link `https://example.com/join` | App: inline error, not saved. Back office: field error. API: 422 | |
| E6 | Negative | Map link `https://maps.app.goo.gl.evil.com/x` | Rejected (lookalike domain) | |
| E7 | Negative | Phone `call me` | Rejected | |
| E8 | Negative | Save from an older app version (no new fields sent) | Existing contacts are kept, not wiped | |
| E9 | Negative | All fields empty | Saves fine; no contact card shown | |

### F. Toasts
| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| F1 | Positive | Save in any back-office screen (users, roles, emails, calendar, locations, settings, notifications…) | Green toast top-right, closes by itself; hovering pauses it | |
| F2 | Positive | Trigger a save error | Red toast with the server's message, stays 6 s | |
| F3 | Negative | A page that fails to load | Still shows the inline error (not a toast) | |
| F4 | Negative | Delete actions | Confirmation dialog still appears before deleting | |
