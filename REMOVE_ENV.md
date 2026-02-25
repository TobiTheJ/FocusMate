# Xóa .env khỏi GitHub sau khi đã push

## 🚨 Tình huống: .env đã bị push lên GitHub

Đây là tình huống nguy hiểm vì password và API keys đã bị lộ. Bạn cần:
1. Xóa .env khỏi GitHub
2. Đổi TẤT CẢ thông tin nhạy cảm (password, API keys)

---

## 📋 Bước 1: Xóa .env khỏi GitHub (giữ file trong máy)

**⚠️ QUAN TRỌNG: Phải làm đủ 4 bước, đặc biệt là bước 3 và 4**

```bash
# 1. Thêm .env vào .gitignore (nếu chưa có)
echo ".env" >> .gitignore

# 2. Xóa .env khỏi git nhưng GIỮ LẠI file trong máy
git rm --cached .env

# 3. Commit thay đổi (BƯỚC NÀY BẮT BUỘC)
git add .gitignore
git add .env  # Thêm vào để đánh dấu xóa
git commit -m "Remove .env from repository for security"

# 4. Push lên GitHub (BƯỚC NÀY BẮT BUỘC)
git push origin main
```

### 🔍 Kiểm tra sau khi push:

```bash
# Xem trạng thái git
git status

# Nếu thấy "nothing to commit, working tree clean" là OK
```

### ❌ Nếu vẫn còn trên GitHub sau khi push:

Có thể do:
1. **Chưa push** - Chạy `git push origin main`
2. **Commit cũ vẫn còn** - .env sẽ mất ở commit mới, nhưng vẫn còn trong lịch sử cũ
3. **Cần xóa khỏi lịch sử** - Dùng cách dưới đây:

#### Cách xóa hoàn toàn khỏi lịch sử Git (Nâng cao):

```bash
# Xóa .env khỏi TẤT CẢ lịch sử commit
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch .env' \
--prune-empty --tag-name-filter cat -- --all

# Force push (CẨN THẬN: sẽ thay đổi lịch sử)
git push origin main --force
```

> ⚠️ **Cảnh báo**: Lệnh trên sẽ xóa .env khỏi TẤT CẢ commit trong lịch sử. Chỉ dùng khi thực sự cần thiết.

✅ Sau lệnh này, .env sẽ biến mất khỏi GitHub nhưng vẫn còn trong máy bạn.

---

## 📋 Bước 2: Đổi TẤT CẢ thông tin nhạy cảm (QUAN TRỌNG!)

Vì .env đã từng lộ trên GitHub, ai đó có thể đã copy thông tin. Bạn PHẢI đổi:

### 2.1 Đổi password database Neon

1. Truy cập [neon.tech](https://neon.tech) → Dashboard
2. Chọn project `focusmate`
3. Vào **Settings** → **Reset password**
4. Tạo password mới
5. Copy connection string mới
6. Cập nhật lại `.env` với password mới

### 2.2 Tạo API key mới cho Gemini

1. Truy cập [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Xóa API key cũ
3. Tạo API key mới
4. Cập nhật `GEMINI_API_KEY` trong `.env`

### 2.3 Tạo NEXTAUTH_SECRET mới

```bash
# Tạo secret mới
openssl rand -base64 32
```

Hoặc dùng secret này (đã tạo sẵn):
```
K9mP2vL5nQ8rT3bF6jW9xZ2aK4lP7oE1iU5yT8wQ3rN6mB9vC2fG5hJ8kL1pO4e
```

### 2.4 Cập nhật file .env

```env
# Database - Neon (đã đổi password)
DATABASE_URL="postgresql://neondb_owner:[PASSWORD_MỚI]@ep-silent-feather-a1efjzr2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:[PASSWORD_MỚI]@ep-silent-feather-a1efjzr2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# NextAuth (đã đổi secret)
NEXTAUTH_SECRET="K9mP2vL5nQ8rT3bF6jW9xZ2aK4lP7oE1iU5yT8wQ3rN6mB9vC2fG5hJ8kL1pO4e"

# Gemini (đã đổi API key)
GEMINI_API_KEY="[API_KEY_MỚI]"
```

---

## 📋 Bước 3: Chạy lại migrations với database mới

```bash
# Chạy migrations
npx prisma migrate deploy
```

---

## 📋 Bước 4: Test lại local

```bash
npm run dev
```

Test đăng ký/đăng nhập để đảm bảo database mới hoạt động.

---

## 📋 Bước 5: Cập nhật Vercel (nếu đã deploy)

Nếu đã deploy lên Vercel, bạn cũng cần cập nhật Environment Variables:

1. Vào Vercel Dashboard → Project → Settings
2. Environment Variables
3. Cập nhật tất cả biến với giá trị mới
4. Redeploy

---

## ⚠️ Tại sao PHẢI đổi tất cả?

| Thông tin | Rủi ro nếu không đổi |
|-----------|---------------------|
| Database password | Ai đó có thể xóa/sửa database của bạn |
| Gemini API key | Ai đó có thể dùng hết quota của bạn |
| NEXTAUTH_SECRET | Ai đó có thể giả mạo session đăng nhập |

---

## ✅ Checklist sau khi xóa .env

- [ ] .env đã xóa khỏi GitHub
- [ ] Password database Neon đã đổi
- [ ] API key Gemini đã đổi
- [ ] NEXTAUTH_SECRET đã đổi
- [ ] Migrations chạy lại thành công
- [ ] Test local hoạt động
- [ ] Vercel đã cập nhật (nếu có)

---

## 🎯 Tóm tắt lệnh

```bash
# 1. Xóa .env khỏi GitHub
echo ".env" >> .gitignore
git rm --cached .env
git add .gitignore
git commit -m "Remove .env from repository for security"
git push origin main

# 2. Đổi password database trên Neon Dashboard
# 3. Tạo API key Gemini mới
# 4. Tạo NEXTAUTH_SECRET mới
# 5. Cập nhật file .env trong máy
# 6. Chạy lại migrations
npx prisma migrate deploy
```
