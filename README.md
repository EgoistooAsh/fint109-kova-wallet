# Kova Wallet: send-money mobile web app

Final project for **FINT109 Mobile Web App Development** (FINT109-CON05, 1Q26)
by **Aleck Joaquin T. Abacan**, BS Financial Technology, Mapúa University Makati.

Kova Wallet is a fictional e-wallet for workers abroad, freelancers and travelers. Money added by QR, bank transfer, card or cash becomes a USDC balance that can be spent or sent home for a flat $0.50 fee. This prototype covers adding money and the full send-money journey, from sign-in to a confirmed transfer in the activity history.

> Kova Wallet is not a real product. No real money moves, and all names, balances and rates are made up.

## Try it

- **Live site:** [egoistooash.github.io/fint109-kova-wallet](https://egoistooash.github.io/fint109-kova-wallet/)
- **Source code:** [github.com/EgoistooAsh/fint109-kova-wallet](https://github.com/EgoistooAsh/fint109-kova-wallet)

Open the live site, choose **Try the demo**, then sign in with the demo account:

| Email | Password |
|---|---|
| maria@kova.example | kova2026 |

To run it offline, download the repository and open `index.html` in a browser.

## Supported devices

Since this is a Mobile Web App Development course, Kova is built mobile-first and works on phones, tablets and computers, in portrait and landscape. It was tested on these 26 screen profiles using browser device emulation:

| Type | Devices |
|---|---|
| Phones | Galaxy Fold (folded), iPhone SE (1st gen), Galaxy S8, Galaxy S24, iPhone SE (3rd gen), iPhone 15, Pixel 7, iPhone 15 Pro Max, Galaxy A55 |
| Phones in landscape | iPhone SE (3rd gen), iPhone 15, Pixel 7 |
| Tablets | Galaxy Tab S9, Galaxy Fold (open), iPad Mini, iPad (7th gen), iPad Pro 11 |
| Tablets in landscape | iPad Mini, iPad Pro 11 |
| Laptops and monitors | 1280×720, 1366×768, 1440×900 (MacBook Air), 1536×864, 1920×1080 (Full HD), 2560×1440 (QHD), 3440×1440 (ultrawide) |

## Views

| Page | Purpose |
|---|---|
| `index.html` | Landing page: how it works, fee comparison table, why Kova |
| `sign-in.html` | Sign-in form with demo account, show-password and error summary |
| `dashboard.html` | Balance (with hide toggle), today's rates, quick actions, recent activity |
| `top-up.html` | Add money by bank app QR, bank transfer, card or cash, with a live summary and payment steps |
| `send.html` | Send money form with saved recipients and a live fee breakdown |
| `confirm.html` | Review screen, then a confirmation with a reference number |
| `activity.html` | Transaction history table with type and month filters |
| `help.html` | FAQ, privacy notice and contact support |

Navigation is consistent across the app: a bottom tab bar on phones, a top bar on tablets (768px) and a sidebar on desktops (1100px). Every page has a light and dark mode switch in the header.

## Features mapped to the brief

- **Form controls:** text, email, tel, number (money), date, select, radio, checkbox, submit and reset.
- **Validation:** visible labels, "optional" marked instead of required, input constraints (`min`, `max`, `step`, `pattern`, `minlength`), an error summary that links to each field, inline messages and a review step before anything is sent.
- **Financial tables:** fee comparison, today's rates, fee breakdown, top-up summary, ways to add money and transaction history with a net total. The history becomes stacked cards on phones.
- **Interaction:** live fee estimates, saved-recipient shortcuts, quick top-up amounts, payment steps for each way to add money (with a scannable demo QR code and copy buttons), balance hide toggle, activity filters, and a balance that updates after every transfer and top-up.
- **Privacy:** only the data each task needs; saved cards instead of typing card numbers; no personal data in URLs; a source-of-funds question only for top-ups of 1,000 USDC or more; a plain-language privacy notice that says what is collected, why and for how long.
- **Light and dark mode:** follows the device setting by default; the switch in the header overrides it and is remembered on that device. Dark mode works even with JavaScript off.
- **Progressive enhancement:** every page works with JavaScript turned off. The form still submits, the review page shows a sample and the success panel opens with a CSS `:target` link.

## Files

```
index.html  sign-in.html  dashboard.html  top-up.html  send.html  confirm.html  activity.html  help.html
css/style.css     one mobile-first stylesheet
js/theme.js       picks light or dark mode before the page draws
js/app.js         optional enhancements (nothing leaves the browser)
images/           logo, app mock-up, flow diagrams and demo QR code (WebP and SVG)
fonts/            Inter and Plus Jakarta Sans, with their OFL licences
```

## Testing

- W3C Nu HTML Checker: 0 errors and 0 warnings on all 8 pages, the stylesheet and both SVG images.
- axe-core accessibility scan (WCAG 2.2 A/AA): 0 violations on every page at 390px and 1366px, in light and dark mode, including the error states, the four top-up results and the transfer confirmation.
- Device matrix: 26 screen profiles (folded and regular phones in portrait and landscape, tablets, laptops, Full HD, QHD and ultrawide monitors) across 13 page states. No sideways scrolling, no clipped text, every tap target at least 24px (most 44px), inputs at 16px so iPhones don't zoom, and the phone tab bar never covers content.
- Visual spacing check with a well-used demo account (several transfers and top-ups), on phone, tablet and desktop in light and dark mode: no cards or buttons touching and no overlapping text across 18 page states.
- Accessibility settings: larger browser text (150% and 200%), WCAG text spacing, keyboard-only use (every focus stop visible and never hidden under the header or tab bar), Windows high contrast and reduced motion.
- Browser support: JavaScript checked as ES2017; CSS features checked for Safari and iOS 15+, Chrome, Edge, Firefox and Samsung Internet, with fallbacks where older versions miss a feature. Notched iPhones in landscape keep content clear of the notch.
- End-to-end journey test (sign in, send, review, confirm, scheduled transfer, four kinds of top-up, dark mode switch, dashboard, activity, sign out): 81 of 81 checks pass.

## Credits

Fonts: Inter and Plus Jakarta Sans, both under the SIL Open Font License (see `fonts/`). Icons and illustrations were drawn for this project. The demo QR code only contains a note that this is a fictional prototype.
