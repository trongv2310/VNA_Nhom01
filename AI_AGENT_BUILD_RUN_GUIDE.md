# AI Agent build/run guide

Tài liệu này dành cho AI agent hoặc lập trình viên mới clone repo `VNA_Nhom01` và cần dựng project nhanh, an toàn, không làm lộ secret.

## 1. Tổng quan cấu trúc

Repo có 2 app chính:

- `backend_vna`: NestJS + TypeORM + PostgreSQL, mặc định chạy cổng `3000`.
- `Frontend`: Next.js, mặc định chạy cổng `5555`.

Luồng local khuyến nghị:

1. Chạy PostgreSQL.
2. Cấu hình `.env` cho backend và frontend từ file `.env.example`.
3. Cài dependencies cho từng app.
4. Chạy migration backend.
5. Chạy backend bằng `npm run start:dev`.
6. Chạy frontend bằng `npm run dev`.

## 2. Yêu cầu môi trường

- Node.js `>= 20` và `< 25`.
- npm đi kèm Node.
- PostgreSQL local hoặc remote.
- Tài khoản Cloudinary nếu cần upload avatar/file.
- Tài khoản SMTP/app password nếu cần test OTP email.

Kiểm tra nhanh:

```bash
node -v
npm -v
```

## 3. Cấu hình backend

Vào thư mục backend:

```bash
cd backend_vna
```

Tạo file `.env` từ example:

```bash
copy .env.example .env
```

Trên macOS/Linux:

```bash
cp .env.example .env
```

Các biến quan trọng:

```env
APP_PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_database_password
DB_DATABASE=vna_backend

JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=1d
JWT_REFRESH_REMEMBER_EXPIRES_IN=30d

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_FOLDER_USERS=users

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=your_email@gmail.com
```

Lưu ý:

- Không commit file `.env`.
- Nếu chỉ test các màn hình không upload/OTP, Cloudinary và mail có thể chưa cần hoạt động hoàn chỉnh, nhưng các chức năng upload/gửi OTP sẽ cần cấu hình thật.
- Database trong `.env` phải tồn tại trước khi chạy migration.

Tạo database PostgreSQL nếu chưa có:

```sql
CREATE DATABASE vna_backend;
```

## 4. Cài đặt và chạy backend

Trong `backend_vna`:

```bash
npm install
npm run migration:run
npm run build
npm run start:dev
```

Backend chạy tại:

```text
http://localhost:3000/api/v1
```

Swagger:

```text
http://localhost:3000/api/docs
```

Một API public có thể dùng để smoke test:

```bash
curl http://localhost:3000/api/v1/businesses/register/options
```

Kỳ vọng:

- HTTP `200`.
- Có danh sách `businessTypeOptions`.
- Có danh sách `industries`.

## 5. Cấu hình frontend

Mở terminal khác, vào thư mục frontend:

```bash
cd Frontend
```

Tạo file `.env` từ example:

```bash
copy .env.example .env
```

Trên macOS/Linux:

```bash
cp .env.example .env
```

Nội dung mặc định nên giữ cho local:

```env
NEXT_PUBLIC_API_URL=/api/v1
BACKEND_API_URL=http://localhost:3000/api/v1
```

Giải thích:

- Frontend gọi `/api/v1`.
- Next.js rewrite request `/api/v1/*` sang backend tại `BACKEND_API_URL`.
- Vì vậy khi chạy local, cần bật backend ở cổng `3000` trước hoặc song song.

## 6. Cài đặt và chạy frontend

Trong `Frontend`:

```bash
npm install
npm run build
npm run dev
```

Frontend chạy tại:

```text
http://localhost:5555
```

Trang đăng nhập sở/admin:

```text
http://localhost:5555/department/login
```

Dashboard:

```text
http://localhost:5555/department/dashboard
```

## 7. Thứ tự chạy khuyến nghị mỗi lần dev

Terminal 1:

```bash
cd backend_vna
npm run start:dev
```

Terminal 2:

```bash
cd Frontend
npm run dev
```

Sau đó mở:

```text
http://localhost:5555
```

## 8. Migration và dữ liệu danh mục

Project dùng TypeORM migration. Sau khi clone mới hoặc đổi DB, luôn chạy:

```bash
cd backend_vna
npm run migration:run
```

Các migration hiện tại có nhiệm vụ:

- Tạo/bổ sung bảng quyền và vai trò.
- Tạo/bổ sung kỳ báo cáo TNLĐ.
- Tạo/bổ sung danh mục loại hình kinh doanh.
- Tạo/bổ sung danh mục ngành nghề kinh doanh.
- Tạo/bổ sung danh mục tai nạn lao động.
- Backfill dữ liệu cũ sang các cột/danh mục mới để tránh vỡ dữ liệu đang có.

Nếu migration lỗi vì database chưa tồn tại, hãy tạo database trước.

Nếu migration lỗi vì port/database credential sai, kiểm tra lại `.env` backend.

## 9. Build kiểm tra trước khi bàn giao

Backend:

```bash
cd backend_vna
npm run build
```

Frontend:

```bash
cd Frontend
npm run build
```

Lưu ý với Next.js:

- Khi chạy `npm run build`, file generated `Frontend/next-env.d.ts` có thể tự đổi reference giữa `.next/dev/types/routes.d.ts` và `.next/types/routes.d.ts`.
- Đây là file generated của Next.js, không phải logic nghiệp vụ.

## 10. Lỗi thường gặp

### Backend không kết nối DB

Kiểm tra:

- PostgreSQL đã chạy chưa.
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` trong `backend_vna/.env`.
- Database đã được tạo chưa.

### Frontend báo không kết nối máy chủ

Kiểm tra:

- Backend đã chạy ở `http://localhost:3000/api/v1` chưa.
- `Frontend/.env` có `BACKEND_API_URL=http://localhost:3000/api/v1` chưa.
- Nếu đổi backend port, sửa lại `BACKEND_API_URL`.

### Port bị chiếm

Windows PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
Get-NetTCPConnection -LocalPort 5555 -State Listen
```

Nếu cần dừng process, chỉ dừng đúng process bạn chắc chắn là dev server của project.

### Upload file/avatar lỗi

Kiểm tra Cloudinary:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### OTP email không gửi

Kiểm tra SMTP:

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USER`
- `MAIL_PASSWORD`
- `MAIL_FROM`

Với Gmail, nên dùng app password thay vì mật khẩu tài khoản thường.

## 11. Checklist nhanh cho AI agent sau khi clone

```bash
cd backend_vna
npm install
npm run migration:run
npm run build
npm run start:dev
```

Mở terminal khác:

```bash
cd Frontend
npm install
npm run build
npm run dev
```

Smoke test:

```text
Backend:  http://localhost:3000/api/v1/businesses/register/options
Frontend: http://localhost:5555/department/login
```

Nếu cả hai hoạt động, project đã sẵn sàng để test nghiệp vụ.
