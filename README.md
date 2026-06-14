# Oveikals POS — slaidrāde

Veikala ekrānu slaidrāde ar admin paneli. Next.js + MongoDB, izvietota uz Vercel.

- **Publiskā slaidrāde:** `/pos` — automātiska, pilnekrāna režīms (klikšķis = pilnekrāns)
- **Admin panelis:** `/pos/admin` — aizsargāts ar paroli; augšupielādē, kārto, slēpj un dzēš slaidus

## Vides mainīgie (Vercel → Settings → Environment Variables)

| Mainīgais | Apraksts |
|-----------|----------|
| `MONGODB_URI` | MongoDB Atlas savienojuma virkne |
| `MONGODB_DB` | Datu bāzes nosaukums (nav obligāts) |
| `ADMIN_PASSWORD` | Admin paneļa parole |
| `AUTH_SECRET` | Gara nejauša virkne sīkdatņu parakstīšanai |
| `NEXT_PUBLIC_BASE_PATH` | `/pos` (vai tukšs, ja saknē) |

## Lokāli

```bash
npm install
cp .env.example .env.local   # aizpildi vērtības
npm run dev
# http://localhost:3000/pos un /pos/admin
```

## Kā attēli tiek glabāti

Attēli tiek saglabāti MongoDB un atdoti caur `/pos/api/image/<id>` ar gara termiņa kešu.
Nav vajadzīgs atsevišķs failu glabāšanas serviss — tikai MongoDB.
