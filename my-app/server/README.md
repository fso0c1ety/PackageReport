# Package Raport Server

Simple Express + SQLite server to store report columns.

## Endpoints
- `GET /reports` — list all reports (newest first)
- `POST /reports` — create a report
- `PATCH /reports/:id` — update fields; if `status` changes, `dataOra` is set to current time unless provided
- `DELETE /reports/:id` — delete a report

## Run
```powershell
cd C:\Users\Valon\Desktop\PackageRaport\server
npm install
npm start
```
- Server listens on `http://localhost:4000`.
- Database file: `server/data/app.db`.
