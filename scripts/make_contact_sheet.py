from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PREVIEW_DIR = ROOT / "design-previews"
OUTPUT = PREVIEW_DIR / "00-整套UI设计图.png"

files = sorted(path for path in PREVIEW_DIR.glob("*.png") if path.name != OUTPUT.name)
columns = 3
gap = 24
label_height = 50
header_height = 96
phone_width = 390
phone_height = 844
rows = (len(files) + columns - 1) // columns

canvas_width = gap + columns * phone_width + (columns - 1) * gap + gap
canvas_height = header_height + rows * (phone_height + label_height + gap) + gap
canvas = Image.new("RGB", (canvas_width, canvas_height), "#0d0e0c")
draw = ImageDraw.Draw(canvas)

font_path = Path("C:/Windows/Fonts/msyh.ttc")
title_font = ImageFont.truetype(str(font_path), 34)
label_font = ImageFont.truetype(str(font_path), 20)
meta_font = ImageFont.truetype(str(font_path), 15)

draw.text((gap, 22), "暗格门店 · 微信小程序 UI 全景", font=title_font, fill="#f3f0e8")
draw.text((gap, 66), "员工端 / 店长端 / 积分 / 抢单 / 订单进度 / 审核 / 通知", font=meta_font, fill="#aaa89f")

for index, path in enumerate(files):
    row = index // columns
    column = index % columns
    x = gap + column * (phone_width + gap)
    y = header_height + row * (phone_height + label_height + gap)
    image = Image.open(path).convert("RGB")
    if image.size != (phone_width, phone_height):
        image = image.resize((phone_width, phone_height), Image.Resampling.LANCZOS)
    canvas.paste(image, (x, y + label_height))
    label = path.stem.split("-", 1)[-1]
    draw.text((x, y + 12), label, font=label_font, fill="#e9aa3a")

canvas.save(OUTPUT, quality=95)
print(OUTPUT)
