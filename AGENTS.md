# AGENTS.md

## Muc dich
- Day la file rule goc cho toan bo repo.
- Moi task moi bat buoc doc file nay truoc khi phan tich, code, test, hoac ket thuc.
- Neu huong dan o day xung dot voi thoi quen lam viec thong thuong, uu tien file nay.

## Kien truc project
- `frontend/`: ung dung React + TypeScript + Vite + Tailwind cho giao dien user-facing.
- `node-gateway/`: backend gateway Express + TypeScript + Mongoose, cung cap API cho frontend.
  - Entry point cua package dat o root:
    - `node-gateway/app.ts`: khoi tao Express app va middleware/router
    - `node-gateway/server.ts`: bootstrap env, DB, seed, va start HTTP server
  - Toan bo domain code backend nam trong `node-gateway/src`
- `fastapi-ai/`: AI microservice Python/FastAPI. Phase hien tai uu tien mock AI o gateway; chi dong vao service nay khi task yeu cau ro rang.

## Kien truc code backend
- Backend `node-gateway` phai dat theo domain va layer:
  - `app.ts`
  - `server.ts`
  - `src/routes/*.routes.ts`
  - `src/controllers/*.controller.ts`
  - `src/services/*.service.ts`
  - `src/models/*.model.ts`
  - `src/middlewares/*.middleware.ts`
  - `src/seeds/*.seed.ts`
  - `src/utils/*`
  - `src/types/*`
- Naming phai nhat quan theo mau:
  - `user.routes.ts -> user.controller.ts -> user.service.ts -> user.model.ts`
  - Tuong tu cho `content`, `submission`, `document`, `review`, `assistant`, `library`, `subscription`.
- Quy tac entrypoint bat buoc:
  - `app.ts` va `server.ts` cua `node-gateway` phai dat o root package, khong dat trong `src`.
  - `app.ts` chi dung de tao Express app va gan middleware/router.
  - `server.ts` chi dung de bootstrap runtime nhu env, DB, seed, va `listen`.

## Code convention
- Uu tien TypeScript strict, khong dung `any` neu khong that su can thiet.
- Controllers mong:
  - chi nhan request, validate input co ban, goi service, tra response.
- Services chua business logic:
  - khong dua response HTTP vao service.
- Models chi chua schema/index/static can thiet.
- Utility dung cho logic dung chung, khong chen business flow domain vao utility neu no thuoc service.
- Response API dung envelope thong nhat:
  - `success`
  - `message`
  - `data`
- Loi phai di qua middleware xu ly loi tap trung.
- Moi query/model phai co ownership check neu du lieu thuoc user.
- Frontend:
  - page trong `src/pages`
  - shared/layout component trong `src/components`
  - API layer va data fetching tach khoi UI render
  - route su dung `react-router-dom`

## Quy tac quan trong
- Moi task bat buoc doc `AGENTS.md` truoc tien.
- Khong duoc ket thuc task neu chua chay test/build cua tat ca package bi anh huong.
- Khi sua xong mot task, phai:
  1. chay test lien quan
  2. chay build/typecheck lien quan
  3. chi ket thuc khi tat ca deu pass va khong con loi
- Neu package chua co test cho logic moi, phai bo sung it nhat mot automated test meaningful trong cung task.
- Khong duoc ket thuc voi trang thai "da xong" neu van con TODO chinh, loi build, loi type, hoac test fail.
- Uu tien sua theo huong nho, ro, co the test duoc.
- Neu thay doi contract API, phai dong bo frontend/gateway trong cung task neu task do anh huong nguoi dung.

## Quy tac env va du lieu mau
- Khong hardcode secret that trong code.
- Moi bien moi can co cap nhat `.env.example` neu can thiet.
- Seed/demo data phai du de frontend khong roi vao trang thai rong trong phase mock/demo.
- Upload file luu local disk o gateway trong phase hien tai; DB chi luu metadata va path.
- Local dev cua `node-gateway` duoc phep fallback sang in-memory MongoDB khi DB chinh khong ket noi duoc, nhung chi dung cho non-production.

## Build va test command

### Frontend
- Cai dat: `npm install`
- Dev: `npm run dev`
- Bat buoc verify khi co thay doi frontend:
  - `npx tsc --noEmit`
  - `npm run build`

### Node gateway
- Cai dat: `npm install`
- Dev: `npm run dev`
- Build:
  - `npm run build`
- Test:
  - `npm run test`
- Bat buoc verify khi co thay doi gateway:
  - `npm run test`
  - `npm run build`

### FastAPI AI
- Cai dat: `pip install -r requirements.txt`
- Dev: `uvicorn app.main:app --reload --port 8000`
- Neu task co dong vao service nay, bat buoc chay test hoac health check phu hop truoc khi ket thuc.

## Quy trinh thuc hien task
1. Doc `AGENTS.md`.
2. Xac dinh package bi anh huong.
3. Thuc hien code theo dung convention.
4. Bo sung/cap nhat test.
5. Chay test/build bat buoc cua moi package bi anh huong.
6. Chi ket thuc khi tat ca pass.

## Review checklist truoc khi ket thuc
- Da doc `AGENTS.md` o dau task.
- File/dat ten dung convention.
- API response dung envelope thong nhat.
- Khong bo qua ownership/error handling.
- Test pass.
- Build/typecheck pass.
- Khong con loi hien tai trong package bi anh huong.
