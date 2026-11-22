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

## 2 pattern · mỗi pattern có 2 chế độ tách biệt

| # | Pattern | Ý tưởng |
|---|---|---|
| 01 | **Shape** | **Loop**: một shape lặp thành nền theo Tile Type (Grid, Brick by Row/Column, Hex by Column/Row), xoay/lật theo quy tắc hoặc ngẫu nhiên, chạy xuyên suốt. **Thin → Black**: lưới shape, nét viền trong tăng từ hairline đến khối đặc. |
| 02 | **Text** | **Loop**: nền chữ lặp chạy một chiều (ngang/dọc, có thể xen kẽ ngược chiều). **Thin → Black**: nét chữ từ mảnh đến đậm, kèm các lớp chữ màu trượt trái ↔ phải. |

Hai chế độ không bao giờ hiện cùng lúc: chọn ở mục **Chế độ**, bảng điều khiển của chế độ kia được ẩn hoàn toàn.

## Điều khiển trực tiếp

- **Nhịp điệu:** thời lượng loop, easing (Đều, Sine, Cubic, Quint, Expo, Bật, Nấc), kiểu lặp (Mượt đi & về / Nạp reset), độ lan sóng (có thể âm), hướng lan (Chéo, Hàng, Cột, Tâm, Ngẫu nhiên).
- **Độ dày đặc & khoảng cách:** số cột, số hàng, khoảng cách lưới, lề khung, số lần lặp chữ.
- **Trọng lượng nét:** khoảng Thin 100 → Black 900 (hai tay kéo), đảo chiều, preset nhanh. Với shape, "nét" là độ dày đường viền trong, tăng dần đến khối đặc.
- **Assets:** bật/tắt từng shape, tải SVG của bạn (bấm hoặc kéo thả), xoá asset đã tải, giữ màu gốc hoặc tô màu thương hiệu.
- **Màu:** 8 màu thương hiệu, 8 bộ phối nhanh, chọn nền và nhiều màu hình, phối ngẫu nhiên có kiểm tra tương phản.
- **Preview & Xuất file:** PNG (1080 / 2160 / 4096), SVG vector (chữ được chuyển thành outline), GIF, MP4, WebM (loop liền mạch, đúng từng khung).

Phím tắt: `Space` phát/dừng · `1` `2` đổi pattern · `R` ngẫu nhiên · `←` `→` bước khung.

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

## Loop (nền lặp, seamless)

- Loop luôn chạy một chiều, tốc độ đều, đi đúng một số nguyên chu kỳ lưới (hoặc ô chữ) nên khung cuối nối khung đầu. "Số vòng mỗi loop" để chạy nhanh hơn.
- **Shape:** asset là một shape duy nhất (ví dụ `chatbox-02.svg`). Tile type, Brick offset, Width / Height, quy tắc xoay/lật, khoảng cách lưới âm để shape chồng khít, đảo sáng/tối, nhiều màu. Kiểu chạy: cả lưới, hàng xen kẽ, cột xen kẽ (8 hướng), hoặc lật / xoay / đứng yên. Phím `R` bốc lại ngẫu nhiên.
- **Text:** chiều chạy ngang trái/phải hoặc dọc lên/xuống, xen kẽ ngược chiều.
- **Type** (chỉ cho Text): dòng chữ, viết hoa, trọng lượng cố định cho Loop, giãn chữ, khoảng cách giữa các chữ lặp.
- Asset nguyên tile có nền riêng (ví dụ `pattern-01.svg`) phủ kín ô, không gap.
