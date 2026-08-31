import os
from PIL import Image, ImageDraw, ImageFont

# Open the original floor plan
img = Image.open('public/floor_plan_2027.png')
draw = ImageDraw.Draw(img)

# Peach color and white color
PEACH = (251, 241, 230)
WHITE = (252, 252, 252)
TEXT_COLOR = (42, 42, 42)

# Load font
font_path = "/System/Library/Fonts/PingFang.ttc"
font_size = 15

try:
    font = ImageFont.truetype(font_path, font_size)
except Exception:
    font = ImageFont.load_default()

# 1. Left Wall:
# L12 (becomes L2): Keep square, fill only the interior with PEACH to erase old text, write '展位 L2'
# Component 2 bounding box: (69, 441) to (179, 531)
# Fill interior (70, 442, 178, 530) to preserve borders
draw.rectangle([70, 442, 178, 530], fill=PEACH)
draw.text((124, 486), "展位 L2", fill=TEXT_COLOR, font=font, anchor="mm")

# L11 (removed): turn interior into white space, erasing text '展位 L11' but keeping all wall borders.
# Component 3 bounding box: (69, 538) to (179, 626)
# Fill interior (70, 539, 178, 625) with WHITE to preserve borders
draw.rectangle([70, 539, 178, 625], fill=WHITE)

# 2. Right Wall:
# L8 (becomes L6): Keep square, fill only the interior with PEACH to erase old text, write '展位 L6'
# Component 1 bounding box: (825, 440) to (931, 531)
# Fill interior (826, 441, 930, 530) to preserve borders
draw.rectangle([826, 441, 930, 530], fill=PEACH)
draw.text((878, 485), "展位 L6", fill=TEXT_COLOR, font=font, anchor="mm")

# L9 (removed): turn interior into white space, erasing text '展位 L9' but keeping all wall borders.
# Component 4 bounding box: (825, 538) to (931, 626)
# Fill interior (826, 539, 930, 625) with WHITE to preserve borders
draw.rectangle([826, 539, 930, 625], fill=WHITE)

# 3. Bottom Wall Middle-Left L2 -> becomes L3
# L2 was Component 6 (308, 649) to (437, 721)
# Erase old text: fill (309, 650, 436, 720) with PEACH
draw.rectangle([309, 650, 436, 720], fill=PEACH)
draw.text((372, 685), "展位 L3", fill=TEXT_COLOR, font=font, anchor="mm")

# 4. Bottom Wall Middle-Right L4 -> remains L4
# L4 was Component 7 (568, 649) to (693, 721)
# Erase and rewrite to keep font uniform
draw.rectangle([569, 650, 692, 720], fill=PEACH)
draw.text((630, 685), "展位 L4", fill=TEXT_COLOR, font=font, anchor="mm")

# 5. Bottom Right Corner L3 -> becomes L5 (最大獨立展位L5)
# L3 was (705, 634) to (931, 732)
# Erase old text: fill (706, 635, 930, 731) with WHITE
draw.rectangle([706, 635, 930, 731], fill=WHITE)
draw.text((818, 683), "最大獨立展位L5", fill=TEXT_COLOR, font=font, anchor="mm")

# 6. Right Wall Upper L7 -> remains L7
# L7 was Component 0 (825, 326) to (931, 433)
# Erase and rewrite to keep font uniform
draw.rectangle([826, 327, 930, 432], fill=PEACH)
draw.text((878, 379), "展位 L7", fill=TEXT_COLOR, font=font, anchor="mm")

# Save updated image
img.save('public/floor_plan_2027.png')
print('Image updated successfully!')
