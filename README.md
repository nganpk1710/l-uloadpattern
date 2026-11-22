# Lưu Load · Motion Pattern Toolkit

Công cụ tương tác tạo Motion Pattern cho thương hiệu Lưu Load. Cảm giác chuyển động cốt lõi: **load, loop,
mượt từ nét mảnh (Thin) đến đậm đặc (Black)**. Khung xuất 1:1.

Vite + TypeScript thuần, không framework. Chữ vẽ bằng **Big Shoulders** (variable font), giao diện dùng **Aeonik** (xem phần Font).

## Chạy

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # kiểm tra kiểu + build ra dist/
npm run preview
```

## 3 pattern

| # | Pattern | Ý tưởng |
|---|---|---|
| 01 | **Shape Loop** | Lưới hình khối đặc. Mỗi ô "thở" từ đường viền hairline (Thin) đến khối đặc (Black), sóng lan qua lưới. Có thể kèm xoay 90°, lật, co giãn. |
| 02 | **Text Offset** | Các dòng chữ siêu cao xếp chồng, trượt ngang theo số nguyên ô nên loop luôn liền mạch, nét chữ chạy Thin → Black, có thể thêm lớp dư ảnh (echo). |
| 03 | **Wide → Narrow** | Mỗi hàng chia cột; độ rộng cột co giãn hẹp ↔ rộng nhưng tổng luôn lấp đầy khung. Chữ hoặc shape được kéo giãn theo ô. |

## Điều khiển trực tiếp

- **Nhịp điệu:** thời lượng loop, easing (Đều, Sine, Cubic, Quint, Expo, Bật, Nấc), kiểu lặp (Mượt đi & về / Nạp reset), độ lan sóng (có thể âm), hướng lan (Chéo, Hàng, Cột, Tâm, Ngẫu nhiên).
- **Độ dày đặc & khoảng cách:** số cột, số hàng, khoảng cách lưới, lề khung, số lần lặp chữ.
- **Trọng lượng nét:** khoảng Thin 100 → Black 900 (hai tay kéo), đảo chiều, preset nhanh. Với shape, "nét" là độ dày đường viền trong, tăng dần đến khối đặc.
- **Assets:** bật/tắt từng shape, tải SVG của bạn (bấm hoặc kéo thả), xoá asset đã tải, giữ màu gốc hoặc tô màu thương hiệu.
- **Màu:** 8 màu thương hiệu, 8 bộ phối nhanh, chọn nền và nhiều màu hình, phối ngẫu nhiên có kiểm tra tương phản.
- **Preview & Xuất file:** PNG (1080 / 2160 / 4096), SVG vector (chữ được chuyển thành outline), GIF, MP4, WebM (loop liền mạch, đúng từng khung).

Phím tắt: `Space` phát/dừng · `1` `2` `3` đổi pattern · `R` ngẫu nhiên · `←` `→` bước khung.

Trạng thái được lưu trong trình duyệt. Máy bật "giảm chuyển động" sẽ mở ở trạng thái dừng.

## Cấu trúc

```
src/
  core/        engine dùng chung
    state.ts       trạng thái + store + lưu localStorage
    easing.ts      các đường easing
    timeline.ts    loop, sóng lan, ánh xạ trọng lượng → độ dày nét
    painter.ts     giao diện vẽ trừu tượng (khung logic 1080×1080)
    canvasPainter  preview, PNG, GIF, video
    svgPainter     xuất SVG vector (cùng một pattern, vẽ ra SVG)
    assets.ts      đọc SVG → path, thư viện built-in + upload
    fonts.ts       nạp Big Shoulders / Aeonik, đo chữ
    color.ts       bảng màu, preset, phối màu ngẫu nhiên
  patterns/    mỗi pattern là một hàm vẽ lên Painter
  export/      png · svg · gif · video (WebCodecs) · tải file
  ui/          controls, panels, stage (preview + dock xuất file)
  styles/      tokens · base · layout · controls
  assets/
    shapes/    SVG built-in (tự động nhận, không cần đăng ký)
    fonts/     Big Shoulders (OFL) và thư mục aeonik/
```

Pattern chỉ gọi `painter.shape / text / rect`, nên cùng một code ra preview, PNG, video và SVG giống hệt nhau.

## Thêm / sửa nội dung

- **Thêm shape built-in:** bỏ file `.svg` vào `src/assets/shapes/`. Muốn có tên tiếng Việt thì thêm vào `LABELS` trong `src/core/assets.ts`.
- **Đổi bảng màu hoặc preset:** `src/core/color.ts`.
- **Đổi giá trị mặc định:** `DEFAULT_STATE` trong `src/core/state.ts`.
- **Thêm pattern mới:** viết `renderXxx(rc: RenderContext)` trong `src/patterns/`, đăng ký ở `src/patterns/index.ts` và thêm `PatternId` ở `state.ts`.
- **Quy ước SVG asset:** chỉ lấy các hình có fill (path, rect, circle, ellipse, polygon). Stroke, gradient, text, mask chưa được hỗ trợ; nên "Outline Stroke" và "Create Outlines" trước khi xuất từ Figma / Illustrator.

## Font

- **Big Shoulders** nằm sẵn trong repo (giấy phép OFL, xem `src/assets/fonts/OFL.txt`).
- **Aeonik** là font thương mại, chưa kèm theo. Xem `src/assets/fonts/aeonik/README.md`.

## Xuất file: lưu ý

- MP4 và WebM dùng WebCodecs, cần Chrome / Edge / Safari bản mới. Firefox cũ chỉ xuất được PNG, SVG, GIF.
- GIF giới hạn 256 màu và 20–25 fps; dùng MP4/WebM khi cần chất lượng cao.
- SVG: chữ được chuyển thành outline từ font biến thiên, mở được trong Figma / Illustrator mà không cần cài font. Hiệu ứng "nét" của shape là clip-path + stroke; nếu cần path thuần, dùng Outline Stroke / Flatten trong Figma.

## Deploy

Static site, chạy được trên Vercel / Netlify / GitHub Pages (`base: './'`). Vercel: import repo, framework Vite, build `npm run build`, output `dist`.

## Tile liền khít (Shape Loop)

- Mỗi asset là **một tile 1080 duy nhất** (ví dụ `pattern-01.svg`). Tile phủ kín ô, không gap, không lề; các ô được **xoay 90° / lật** theo quy tắc: Giữ nguyên, Đối xứng, Cờ vua, Chong chóng, Xoay vòng, Ngẫu nhiên.
- Lưới nhanh 1×1 · 2×2 · 3×3 · 4×4 · 6×6 · 8×8; nút **Đảo sáng / tối** đổi màu hình và nền (màu lấy từ bộ màu thương hiệu).
- Chuyển động: **Loop trượt** (8 hướng, vòng lặp liền mạch theo chu kỳ quy tắc), Đưa qua lại, Lật, Xoay, Đứng yên. Easing / độ lan sóng điều khiển nhịp.
- "Lưới rời" vẫn giữ chế độ cũ (có gap/lề).
- **Nét Thin → Black chỉ áp dụng cho chữ** (pattern Text Offset): chữ nguyên vẹn, không đóng khung trong shape. "Số lớp chữ màu" + "Biên độ lớp chữ" điều khiển các lớp chữ đỏ/vàng phía sau trượt trái ↔ phải.
