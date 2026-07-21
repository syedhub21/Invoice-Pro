# InvoicePro

A professional invoice management application for creating, previewing, and sharing invoices as PDFs. Built as both a **web app** (live demo below) and a **native Android APK** (download below).

---

## 🌐 Live Demo

Try the web version instantly in your browser:

**👉 [https://invoicepro.vercel.app](https://invoicepro.vercel.app)**

> _Replace the URL above with your actual Vercel deployment link after deploying._

---

## 📱 Download Android APK

Get the installable Android app directly from GitHub Releases — no Play Store required:

**👉 [Download Latest APK](../../releases)**

### Installation Steps

1. Click the link above and download `InvoicePro.apk`
2. On your Android phone, open **Settings → Security** (or **Apps & notifications → Special access**)
3. Enable **"Install unknown apps"** for your browser (Chrome / Firefox / Files)
4. Open the downloaded APK file and tap **Install**
5. Launch **InvoicePro** from your app drawer

### Minimum Requirements

- Android 7.0 (API 24) or higher
- ~20 MB free storage
- Optional: WhatsApp installed (for direct WhatsApp share)

---

## ✨ Features

### Invoice Management
- Create professional invoices with client & business details
- Add line items with quantity, rate, and auto-calculated totals
- Tax, discount, and shipping calculations
- Pre-save clients, products, and business profiles

### PDF Export & Sharing
- **Save PDF** — Downloads directly to your device's Downloads folder
- **Print** — Opens native Android print dialog
- **Share** — Opens share sheet (any app: Gmail, Drive, Telegram, etc.)
- **Email** — Opens email client with PDF attached
- **WhatsApp** — Sends PDF directly to WhatsApp chats

### Polished PDF Layout
- Business branding with logo
- Itemized table with totals
- Signatory section: **Prepared By**, **Checked By**, **Received By** (each on its own line)
- Terms & Conditions at the bottom

### Offline-First
- 100% offline — works without internet
- Data stored locally on your device
- No accounts, no servers, no tracking

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | Zustand + TanStack Query |
| PDF Generation | jsPDF + html2canvas |
| Mobile Wrapper | Capacitor 7 |
| Native Plugin | Custom Java plugin (MediaStore + FileProvider + ACTION_SEND) |

---

## 💻 Run Locally (Developers)

### Prerequisites
- Node.js 18+ or Bun
- Android Studio (for APK builds only)

### Install & Run

```bash
# Install dependencies
bun install

# Start dev server
bun run dev
# → open http://localhost:3000
```

### Build the Android APK

```bash
# 1. Build the Next.js static export
bun run build

# 2. Sync to native project
bun run cap:sync   # or: npx cap sync

# 3. Build APK (requires Android SDK + build tools)
cd android
./gradlew assembleRelease

# 4. Sign the APK (use your own keystore)
~/android-sdk/build-tools/<version>/apksigner sign \
  --ks invoicepro-final-key.jks \
  --out InvoicePro.apk \
  app/build/outputs/apk/release/app-release-unsigned.apk
```

The signed APK will be at `InvoicePro.apk` in the project root.

---

## 📂 Project Structure

```
invoicepro/
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # React + shadcn/ui components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   └── invoice/            # Invoice-specific components
│   ├── lib/                    # Utilities (PDF, Capacitor helpers, db)
│   └── stores/                 # Zustand state stores
├── android/
│   └── app/src/main/java/      # Custom native plugin (Java)
│       └── com/invoicepro/app/
│           ├── MainActivity.java
│           └── InvoiceProPlugin.java
├── prisma/                     # Database schema
└── capacitor.config.ts         # Capacitor config
```

---

## 📋 Native Plugin API

The app includes a custom Capacitor plugin (`InvoiceProPlugin`) that exposes:

| Method | Description |
|--------|-------------|
| `saveToDownloads(options)` | Saves PDF to Android Downloads folder via MediaStore |
| `shareFile(options)` | Opens share sheet with PDF attached |
| `shareToWhatsApp(options)` | Shares PDF directly to WhatsApp |
| `printFile(options)` | Opens print dialog via Android print framework |

---

## 🔒 Privacy

- No analytics, no tracking, no telemetry
- All invoice data lives on your device only
- No data is sent to any server

---

## 📄 License

MIT — free to use, modify, and distribute.

---

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

**Made with ❤️ for small businesses and freelancers.**
