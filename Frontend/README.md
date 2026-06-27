# TTS VNA Nhom01 Frontend

Frontend Next.js App Router cho module VNA.

## Cau truc

- `app/`: routes, layouts va render app.
- `components/`: component dung truc tiep o nhieu man hinh.
- `libs/core/`: UI component dung chung.
- `libs/shared/`: model, type va interface dung chung.
- `libs/tts/`: source rieng cua project TTS.
- `public/`: static assets.

## Cau hinh API

Backend `backend_vna` dang chay mac dinh o:

```env
APP_PORT=3000
GLOBAL_PREFIX=/api/v1
```

Frontend goi API qua Next.js rewrite de tranh loi CORS khi chay khac port:

```env
NEXT_PUBLIC_API_URL=/api/v1
BACKEND_API_URL=http://localhost:3000/api/v1
```

## Cai dat va chay

```bash
cp .env.example .env.local
npm install
npm run dev
```

Truy cap `http://localhost:5555`.
