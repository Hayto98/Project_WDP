<!-- SEED: chạy lại /fk spec khi đã có code để trích xuất token và component thật. -->
---
name: Scientific Research Trend Tracking System
description: Nền tảng phân tích & trực quan hóa xu hướng nghiên cứu khoa học cho giới học thuật.
---

# Design System: Scientific Research Trend Tracking System

## 1. Overview

**Creative North Star: "The Research Observatory" (Đài quan sát nghiên cứu)**

Giao diện là một đài quan sát điềm tĩnh, chính xác: người dùng học thuật đứng ở trung tâm và nhìn toàn cảnh bản đồ tri thức đang dịch chuyển. Cảm giác chủ đạo là **đáng tin cậy, nghiêm túc, chuẩn xác** — mọi con số đều có nguồn gốc, mọi phân tích đều có căn cứ. Bề mặt sạch, mật độ thông tin cao mà vẫn thoáng theo tinh thần Linear/Vercel; dữ liệu là nhân vật chính, trang trí lùi về sau.

Chiến lược màu **restrained**: nền trung tính pha một chút sắc lạnh, để một màu nhấn **teal (xanh mòng két)** xuất hiện có chủ đích (≤10% mỗi màn hình) trên hành động chính, điểm dữ liệu nổi bật và trạng thái tăng trưởng. Chuyển động ở mức **responsive**: có phản hồi và transition mượt để giao diện sống động, nhưng không dàn cảnh phô trương — biểu đồ và số liệu không bao giờ phải chờ animation mới đọc được.

Hệ thống này **từ chối** hai thái cực: không vui nhộn/sặc sỡ làm mất tính học thuật (không màu rực, không minh họa nhí nhố), và không corporate cứng nhắc nhàm chán (không navy + vàng kim, không stock doanh nghiệp). Nó cũng tránh các tell SaaS chung chung.

**Key Characteristics:**
- Dữ liệu là nhân vật chính; UI phục vụ việc đọc-hiểu và ra quyết định.
- Nền trung tính lạnh + một màu nhấn teal dùng tiết chế.
- Sans-serif kỹ thuật cho giao diện, mono cho số liệu/nhãn.
- Hỗ trợ song song Light & Dark mode, cả hai đạt tương phản chuẩn.
- Chuyển động responsive: mượt, có phản hồi, không phô trương.

## 2. Colors

Bảng màu tiết chế: nền trung tính pha sắc lạnh làm khung nền tin cậy, một màu nhấn teal duy nhất mang tín hiệu và hành động. *(Giá trị hex/OKLCH sẽ chốt khi triển khai.)*

### Primary
- **Observatory Teal** (`[to be resolved during implementation]`): Màu nhấn chủ đạo — nút hành động chính, liên kết, điểm dữ liệu/đường xu hướng nổi bật, trạng thái "đang tăng trưởng". Dùng tiết chế theo Named Rule bên dưới.

### Neutral
- **Ink** (`[to be resolved during implementation]`): Text chính; đầu ramp trung tính, đảm bảo ≥4.5:1 trên nền sáng.
- **Muted Ink** (`[to be resolved during implementation]`): Text phụ, nhãn — vẫn phải đạt ≥4.5:1, không dùng xám nhạt "cho sang".
- **Surface** (`[to be resolved during implementation]`): Nền panel/thẻ, tách nhẹ khỏi nền trang.
- **Background** (`[to be resolved during implementation]`): Nền trang, trung tính pha nhẹ sắc lạnh (chroma thấp).
- **Border/Divider** (`[to be resolved during implementation]`): Đường kẻ 1px, phân tách khối.

### Semantic (data viz)
- Cần một thang màu tuần tự (sequential) cho heatmap Research Gap và các chiều xu hướng, **an toàn cho người mù màu** và không chỉ dựa vào màu để truyền tin (kèm nhãn/hình dạng). *(Chốt khi triển khai.)*

### Named Rules
**The One Accent Rule.** Teal là giọng nói duy nhất — xuất hiện trên ≤10% diện tích mỗi màn hình. Sự hiếm hoi chính là điều làm nó có sức nặng. Không dùng teal cho cả mảng lớn.

**The Colorblind-Safe Rule.** Màu không bao giờ là kênh thông tin duy nhất trong biểu đồ/heatmap; luôn kèm nhãn, giá trị hoặc hình dạng.

## 3. Typography

**Display/UI Font:** Một họ sans-serif kỹ thuật/geometric hiện đại `[font pairing to be chosen at implementation]` (tinh thần Linear/Vercel).
**Body Font:** Cùng họ sans, khác trọng lượng.
**Mono Font:** Một họ monospace `[to be chosen]` cho số liệu, DOI, năm, nhãn thống kê và mã.

**Character:** Gọn gàng, trung lập, hiện đại — ưu tiên độ rõ ở mật độ cao. Không ghép hai sans-serif na ná nhau; tương phản tạo ra bằng trọng lượng và bằng cặp sans + mono, không phải bằng hai font giống hệt.

### Hierarchy
- **Display** (trọng lượng đậm, clamp tối đa ≤ 6rem, letter-spacing ≥ -0.04em): Tiêu đề trang lớn, dùng hạn chế.
- **Headline**: Tiêu đề khu vực trên dashboard/kết quả.
- **Title**: Tiêu đề thẻ, panel, nhóm bộ lọc.
- **Body** (line-height thoải mái, độ dài dòng 65–75ch cho văn bản dài như abstract): Nội dung đọc.
- **Label/Mono** (mono, có thể letter-spacing nhẹ): Số liệu, DOI, năm, đơn vị, nhãn trục biểu đồ.

### Named Rules
**The Mono-for-Numbers Rule.** Mọi số liệu định lượng, DOI và nhãn dữ liệu dùng font mono để căn cột và dễ so sánh. Văn xuôi (abstract, mô tả) không dùng mono.

## 4. Elevation

Chủ yếu **phẳng theo mặc định**, phân tầng bằng sắc độ nền (background → surface) và đường kẻ 1px, phù hợp motion responsive. Bóng đổ chỉ xuất hiện như phản hồi trạng thái (hover, dropdown, dialog nổi), mềm và khuếch tán — không dùng bóng nặng kiểu app 2014.

### Named Rules
**The Flat-By-Default Rule.** Bề mặt phẳng khi nghỉ. Bóng chỉ xuất hiện để phản hồi tương tác (hover/focus) hoặc để tách lớp nổi (menu, modal, tooltip).

## 5. Components

*(Chưa có component nào được xây dựng. Phần này sẽ được điền khi chạy lại `/fk spec` ở chế độ scan sau khi có code.)*

## 6. Do's and Don'ts

### Do:
- **Do** giữ dữ liệu là nhân vật chính: biểu đồ, xu hướng và Research Gap đọc được trong vài giây.
- **Do** luôn hiển thị nguồn dữ liệu, thời điểm cập nhật và căn cứ phân tích — đặc biệt với kết quả AI.
- **Do** dùng teal tiết chế (≤10% mỗi màn hình) cho hành động và tín hiệu quan trọng.
- **Do** dùng font mono cho mọi số liệu, DOI, năm và nhãn thống kê.
- **Do** đạt WCAG 2.1 AA: text ≥4.5:1 (text lớn ≥3:1), focus rõ, thao tác đầy đủ bằng bàn phím.
- **Do** hỗ trợ Light & Dark mode và tôn trọng `prefers-reduced-motion` (thay animation bằng crossfade/tức thời).
- **Do** phân biệt rõ ngữ cảnh Student (khám phá/phân tích) và Admin (vận hành/giám sát).

### Don't:
- **Don't** làm giao diện vui nhộn/sặc sỡ: không bảng màu rực rỡ, minh họa nhí nhố hay hiệu ứng làm mất tính nghiêm túc học thuật.
- **Don't** rơi vào corporate cứng nhắc nhàm chán: không navy + vàng kim, không stock doanh nghiệp khô khan.
- **Don't** dùng các tell SaaS chung chung: gradient text, hero-metric template, lưới card icon-heading-text lặp lại vô tận.
- **Don't** dùng xám nhạt cho body/placeholder "cho sang" khi tương phản chưa đạt 4.5:1.
- **Don't** để màu là kênh thông tin duy nhất trong heatmap/biểu đồ (nghĩ tới người mù màu).
- **Don't** gate nội dung sau animation; số liệu phải đọc được ngay, không chờ reveal.
