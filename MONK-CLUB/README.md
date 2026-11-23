# Amatugunda Monk Club (member app)

The Monk Loyalty Club app for members of Prof Bioresearch: apply, sign in with
phone or email, pay the registration fee by mobile money, see the loyalty card
and the yearly performance tracker, and manage the account. Light and dark
themes, built for phones first (works as an installable web app).

It talks to the PBMS API (`PBMS-BKD`, routes under `/api/club`).

## Run it

```bash
cd MONK-CLUB
cp .env.example .env        # VITE_API_URL = address of the PBMS API (default http://localhost:3500)
npm install
npm run dev                 # http://localhost:5175
```

## Build for production

```bash
npm run build               # output in dist/
```

Upload `dist/` to the club's web host (Netlify works: `public/_redirects` is included;
on Apache/Nginx send unknown paths to `index.html`). Then, on the API server, add the
app's address to the API's `.env` so the browser is allowed to call it:

```
CLUB_APP_ORIGINS=https://club.your-domain.com
```

## How it flows

1. **Apply** (`/register`), one step at a time: photo (can be skipped) → title, names,
   National ID or passport → country, then for Uganda district → county → sub-county
   (built-in list of 135 districts; anything missing can be typed) → telephone 1 & 2,
   email → next of kin (first required, up to 4) → ID/passport copies → check & accept terms.
   Answers survive a page refresh. Big phone photos are shrunk before upload.
2. Staff **approve or reject** in PBMS (Monk Loyalty Club → Club Members). On approval the
   member gets a loyalty card number (`PBMC-YY-NNNNNN`, unique) and a temporary password
   by email, or by SMS when there's no email.
3. **First sign-in** (email or phone + password): the member must set their own password.
4. **Pay** the registration fee: UGX 50,000 plus a service charge (shown as one line: the 3 % mobile money charge + UGX 1,000)
   by MTN/Airtel. Only the UGX 50,000 goes to the club wallet. The membership becomes
   active as soon as MarzPay confirms.
5. **Active**: loyalty card with a QR code (scanning it opens `/verify/<card number>`, which shows
   whether the card is genuine and active), tracker (filled in by staff in PBMS), leaderboard
   (monthly and all time, by quantity supplied), settings (photo, contacts, address, next of kin,
   password, theme).
6. **Shop**: products marked "show in POS" in PBMS, at the club discount set in PBMS →
   Amatugunda Monk Club → Club Settings. Cart → checkout: deliver to the saved address
   (default) or a new one; pay by mobile money (with the service charge), on delivery, or cash.
   Members follow their orders under **My orders**; staff handle them in PBMS → Club Orders.

The terms shown to applicants are in `src/lib/terms.ts`.

## Try it locally without real payments

1. In `PBMS-BKD/.env` add `CLUB_SIMULATE_PAYMENTS=success` (or `fail` to see a declined payment),
   then restart the API. Payments then complete by themselves about 5 seconds after
   **Pay** is tapped; nobody is charged. This is ignored when `NODE_ENV=production`.
2. Start the API (`PBMS-BKD`), PBMS (`PBMS-NEW-FTD`) and this app (`npm run dev`).
3. Open http://localhost:5175 and **Apply to join** (any 14-character NIN works, e.g. `CM90012345ABCD`).
4. In PBMS → Monk Loyalty Club → Club Members, open the application and **Approve** it.
   Without SMS/email keys the message isn't sent, so PBMS shows the temporary password: copy it.
5. Back in the app, sign in with the phone number or email and that password, set a new
   password, then **Pay**. After a few seconds the card shows as active.
6. In PBMS → Performance tracker, fill in some lots for the member; they appear under **Tracker** in the app.

Remove `CLUB_SIMULATE_PAYMENTS` (or leave it empty) before going live.
