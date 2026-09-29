# Split — agen patungan untuk grup chat

Data disimpan di browser (localStorage, skema tabel sama seperti SQLite) → **tanpa DB eksternal**. Ganti ke DB nanti lewat fungsi `save/load` di `src/main.ts`.

## Deploy dari HP (tanpa laptop)
1. GitHub → repo baru → *Add file → Upload files* (pertahankan folder `src/ api/ tests/`).
2. vercel.com → *Add New Project* → import repo (preset Vite otomatis).
3. *Environment Variables*: `ANTHROPIC_API_KEY` (opsional; tanpa ini pakai parser heuristik). Deploy.
4. Tes lokal (opsional): `npm i && npm test && npm run dev`.

## Pembayaran
`src/rail.ts`: `mockRail` (default) & `sphereRail` (Sphere Connect, user approve di wallet, testnet2). Centang "Bayar via Sphere wallet" di UI. Set wallet tujuan: `/wallet Budi @nametag`.
Hasil `4201` (unknown) → tidak di-retry; `4003` (ditolak) → boleh ulang.

## Demo 4 orang
```
/group Makan Malam
/wallet Andi @andi
Andi bayar makan malam 400rb, patungan Andi Budi Cici Dedi   → tiap orang 100.000
/settle                                                       → Budi, Cici, Dedi → Andi @100.000
(klik "Setujui & bayar" ×3, wallet meminta konfirmasi)
/remind                                                       → pengingat (maks 2 per utang)
Tab "Audit log"                                               → semua aksi agen
```
