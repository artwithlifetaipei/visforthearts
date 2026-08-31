from PIL import Image, ImageDraw

# Open the base floor plan
img = Image.open('public/floor_plan_2027_base.png').convert('RGB')
w, h = img.size
pixels = img.load()
draw = ImageDraw.Draw(img)

# Bounding boxes of texts detected in floor_plan_2027_base.png
# Format: (x0, y0, x1, y1)
text_boxes = [
    (782, 167, 828, 181), # 整電盤
    (89, 184, 156, 195),  # 後方器材室
    (854, 193, 911, 205), # 休息室 2
    (204, 212, 271, 222), # 廠方器材室 (left)
    (738, 212, 805, 222), # 廠方器材室 (right)
    (92, 302, 149, 314),  # 休息室 3
    (847, 302, 921, 314), # 展商休息區
    (211, 323, 240, 335), # A03
    (349, 323, 378, 335), # A02
    (530, 323, 559, 335), # A02
    (671, 323, 700, 335), # A03
    (472, 394, 534, 422), # 2027 中央策展區
    (91, 411, 152, 440),  # 廠方器材 / 儲藏室
    (861, 419, 884, 429),  # 展位 L7
    (456, 436, 560, 446),  # Live Perspective Talk
    (638, 456, 733, 475),  # A01主入口隔壁
    (311, 460, 406, 481),  # A01主入口隔壁
    (210, 477, 276, 488),  # A05雙展台
    (860, 526, 896, 537),  # 展位 L6
    (93, 528, 144, 538),   # 展位 L2
    (700, 534, 765, 546),  # A05雙展台
    (578, 552, 672, 572),  # A04最近主入口
    (311, 567, 405, 579),  # A04最近主入口
    (477, 622, 526, 636),  # 主入口
    (105, 632, 228, 647),  # 最大獨立展位L1
    (780, 636, 877, 646),  # 最大獨立展位L5
    (346, 637, 381, 648),  # 展位 L3
    (607, 637, 643, 648),  # 展位 L4
]

# For each box, expand it by 3 pixels and fill with its background color
for (x0, y0, x1, y1) in text_boxes:
    # Sample background color 5 pixels above top-left corner
    bg_x = max(0, min(w - 1, x0))
    bg_y = max(0, min(h - 1, y0 - 5))
    bg_color = pixels[bg_x, bg_y]
    
    # Expand box coordinates
    ex_x0 = max(0, x0 - 3)
    ex_y0 = max(0, y0 - 3)
    ex_x1 = min(w - 1, x1 + 3)
    ex_y1 = min(h - 1, y1 + 3)
    
    # Fill expanded box
    draw.rectangle([ex_x0, ex_y0, ex_x1, ex_y1], fill=bg_color)

# Save cleaned background image
img.save('public/floor_plan_2027_bg.png')
print('Cleaned background saved to public/floor_plan_2027_bg.png')
