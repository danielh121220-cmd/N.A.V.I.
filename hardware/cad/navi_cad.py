import math
import os
import sys
import cadquery as cq

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
os.makedirs(OUT, exist_ok=True)
FONT = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
if not os.path.exists(FONT):
    FONT = None

W, H, R = 90.0, 126.0, 16.0
D = 37.0
T = 2.4
TF = 1.6
EDGE = 3.0
PLATE = 3.0
LIP = 2.0
CLR = 0.25

PANEL_C = (0.0, 34.0)
PANEL = (66.0, 36.0, 7.0)
PANEL_DEPTH = 0.8
OLED_WIN = (0.0, 35.0, 25.0, 15.0)
VL53_WIN = (24.0, 41.0, 6.0, 4.0)
PN532_C = (0.0, -10.0)
PN532 = (43.0, 41.0)
OLED_C = (0.0, 35.0)
OLED = (27.3, 27.8)
VL53_C = (24.0, 32.5)
VL53 = (10.7, 25.0)
LED_Y = -50.0
LED_X = (-10.0, 0.0, 10.0)
LED_D = 5.2
BUZZ_C = (32.0, 6.0)
BUZZ_D = 12.4
ESP_C = (0.0, -43.0)
ESP = (52.0, 28.3)
BOSS = [(sx * 33.5, sy * 51.5) for sx in (-1, 1) for sy in (-1, 1)]
ENGRAVE = 0.6


def rrect(w, h, r, z0, height, cx=0.0, cy=0.0):
    r = min(r, w / 2 - 0.01, h / 2 - 0.01)
    return (cq.Workplane("XY").workplane(offset=z0).center(cx, cy)
            .sketch().rect(w, h).vertices().fillet(r).finalize().extrude(height))


def box(cx, cy, z0, w, h, height):
    return cq.Workplane("XY").box(w, h, height, centered=(True, True, False)).translate((cx, cy, z0))


def corner_guides(cx, cy, w, h, z0, height, leg=6.0, t=1.6, gap=0.3):
    hw, hh = w / 2 + gap, h / 2 + gap
    g = None
    for sx in (-1, 1):
        for sy in (-1, 1):
            x0 = cx + sx * (hw + t / 2)
            y0 = cy + sy * (hh + t / 2)
            a = box(x0, cy + sy * (hh - leg / 2 + t), z0, t, leg + t, height)
            b = box(cx + sx * (hw - leg / 2 + t), y0, z0, leg + t, t, height)
            piece = a.union(b)
            g = piece if g is None else g.union(piece)
    return g


def waves(cx, cy, size, depth, z0=0.0):
    return _waves(0.0, 0.0, size, depth, z0).mirror("YZ").translate((cx, cy, 0))


def _waves(cx, cy, size, depth, z0=0.0):
    s = size / 100.0
    shape = cq.Workplane("XY").workplane(offset=z0).center(cx - 26 * s, cy).circle(6 * s).extrude(depth)
    for r in (16, 32, 48):
        ring = (cq.Workplane("XY").workplane(offset=z0).center(cx - 26 * s, cy)
                .circle((r + 3) * s).circle((r - 3) * s).extrude(depth))
        wedge = (cq.Workplane("XY").workplane(offset=z0)
                 .polyline([(cx - 26 * s, cy),
                            (cx - 26 * s + 80 * s * math.cos(math.radians(42)), cy + 80 * s * math.sin(math.radians(42))),
                            (cx - 26 * s + 80 * s * math.cos(math.radians(-42)), cy + 80 * s * math.sin(math.radians(-42)))])
                 .close().extrude(depth))
        shape = shape.union(ring.intersect(wedge))
    return shape


def text_solid(txt, size, cx, cy, z0, depth, mirror=False, spacing=None):
    kw = {"fontPath": FONT} if FONT else {}
    t = (cq.Workplane("XY").workplane(offset=z0)
         .text(txt, size, depth, combine=False, halign="center", valign="center", **kw))
    if mirror:
        t = t.mirror("YZ")
    return t.translate((cx, cy, 0))


def reader_shell():
    s = rrect(W, H, R, 0, D)
    s = s.faces("<Z").edges().fillet(EDGE)
    s = s.cut(rrect(W - 2 * T, H - 2 * T, R - T, TF, D))
    s = s.cut(rrect(PANEL[0], PANEL[1], PANEL[2], -0.1, PANEL_DEPTH + 0.1, *PANEL_C))
    s = s.cut(rrect(OLED_WIN[2], OLED_WIN[3], 1.5, -1, TF + 2, OLED_WIN[0], OLED_WIN[1]))
    s = s.cut(rrect(VL53_WIN[2], VL53_WIN[3], 1.0, -1, TF + 2, VL53_WIN[0], VL53_WIN[1]))
    for x in LED_X:
        s = s.cut(cq.Workplane("XY").center(x, LED_Y).circle(LED_D / 2).extrude(TF + 2).translate((0, 0, -1)))
    s = s.cut(waves(PN532_C[0] + 2, PN532_C[1], 30, ENGRAVE + 0.1, -0.1))
    s = s.cut(text_solid("N.A.V.I", 6.0, 0, -38.5, -0.1, ENGRAVE + 0.1, mirror=True))
    s = s.union(corner_guides(PN532_C[0], PN532_C[1], *PN532, TF, 5.0, gap=0.35))
    s = s.union(corner_guides(OLED_C[0], OLED_C[1], *OLED, TF, 4.0, leg=5.0, gap=0.5))
    s = s.union(corner_guides(VL53_C[0], VL53_C[1], *VL53, TF, 3.0, leg=4.0, t=1.2, gap=0.4))
    for x in LED_X:
        tube = (cq.Workplane("XY").workplane(offset=TF).center(x, LED_Y)
                .circle(4.0).circle(LED_D / 2).extrude(5.0))
        s = s.union(tube)
    cup = (cq.Workplane("XY").workplane(offset=TF).center(*BUZZ_C)
           .circle(BUZZ_D / 2 + 1.4).circle(BUZZ_D / 2).extrude(6.0))
    s = s.union(cup)
    for (x, y) in BOSS:
        boss = cq.Workplane("XY").workplane(offset=TF).center(x, y).circle(3.6).extrude(D - TF)
        s = s.union(boss)
        s = s.cut(cq.Workplane("XY").workplane(offset=D - 14).center(x, y).circle(1.3).extrude(15))
    for dz in (3.5, 7.0, 10.5):
        s = s.cut(box(W / 2 - T / 2, BUZZ_C[1], dz, T + 2, 9.0, 1.6))
    s = s.cut(box(-W / 2 + T / 2, ESP_C[1], D - 10, T + 2, 12.5, 10.5))
    return s


def reader_back():
    p = rrect(W, H, R, 0, PLATE)
    p = p.faces("<Z").edges().fillet(1.0)
    iw, ih = W - 2 * T - 2 * CLR, H - 2 * T - 2 * CLR
    lip = rrect(iw, ih, R - T - CLR, PLATE, LIP).cut(rrect(iw - 3.2, ih - 3.2, R - T - CLR - 1.6, PLATE - 0.1, LIP + 0.2))
    for (x, y) in BOSS:
        lip = lip.cut(cq.Workplane("XY").workplane(offset=PLATE - 0.1).center(x, y).circle(4.4).extrude(LIP + 0.3))
    p = p.union(lip)
    p = p.cut(box(iw / 2 - 0.8, ESP_C[1], PLATE - 0.1, 3.4, 12.5, LIP + 0.3))
    for (x, y) in BOSS:
        p = p.cut(cq.Workplane("XY").center(x, y).circle(1.7).extrude(PLATE + 1).translate((0, 0, -0.5)))
        p = p.cut(cq.Workplane("XY").workplane(offset=-0.01).center(x, y).circle(3.3).workplane(offset=1.7).circle(1.7).loft())
    p = p.union(corner_guides(ESP_C[0], ESP_C[1], *ESP, PLATE, 3.0, leg=7.0, gap=0.5))
    for ky in (32.0, -8.0):
        p = p.cut(cq.Workplane("XY").center(0, ky).circle(4.2).extrude(PLATE + 1).translate((0, 0, -0.5)))
        p = p.cut(box(0, ky + 5, -0.5, 4.2, 10, PLATE + 1))
        p = p.cut(box(0, ky + 5, 1.2, 8.4, 10, PLATE))
    for vx in (-24, -16, -8, 8, 16, 24):
        p = p.cut(rrect(3.0, 16.0, 1.4, -0.5, PLATE + 1, vx, 48))
    p = p.cut(text_solid("N.A.V.I · LECTOR", 4.0, 0, -42, -0.1, 0.5, mirror=True))
    return p


def panel_insert():
    w, h, r = PANEL[0] - 0.4, PANEL[1] - 0.4, PANEL[2] - 0.2
    p = rrect(w, h, r, 0, PANEL_DEPTH, *PANEL_C)
    p = p.cut(rrect(OLED_WIN[2], OLED_WIN[3], 1.5, -0.5, PANEL_DEPTH + 1, OLED_WIN[0], OLED_WIN[1]))
    p = p.cut(rrect(VL53_WIN[2], VL53_WIN[3], 1.0, -0.5, PANEL_DEPTH + 1, VL53_WIN[0], VL53_WIN[1]))
    return p


CW, CH, CR, CD = 38.0, 52.0, 9.0, 22.0
CAM = (27.0, 40.5)
LENS_Y = 8.0


def cam_shell():
    s = rrect(CW, CH, CR, 0, CD)
    s = s.faces("<Z").edges().fillet(2.0)
    s = s.cut(rrect(CW - 2 * T, CH - 2 * T, CR - T, TF, CD))
    s = s.cut(cq.Workplane("XY").center(0, LENS_Y).circle(4.6).extrude(TF + 2).translate((0, 0, -1)))
    ring = cq.Workplane("XY").center(0, LENS_Y).circle(6.5).circle(5.2).extrude(0.6).translate((0, 0, -0.1))
    s = s.cut(ring)
    s = s.union(corner_guides(0, 0, *CAM, TF, 7.0, leg=5.0, t=1.4, gap=0.45))
    s = s.cut(cq.Workplane(obj=cq.Solid.makeCylinder(4.0, T + 4, cq.Vector(0, -CH / 2 - 2, CD - 7), cq.Vector(0, 1, 0))))
    s = s.cut(text_solid("N.A.V.I", 4.0, 0, -18, -0.1, ENGRAVE + 0.1, mirror=True))
    return s


def cam_back():
    p = rrect(CW, CH, CR, 0, PLATE)
    p = p.faces("<Z").edges().fillet(1.0)
    iw, ih = CW - 2 * T - 2 * CLR, CH - 2 * T - 2 * CLR
    lip = rrect(iw, ih, CR - T - CLR, PLATE, LIP + 1).cut(rrect(iw - 3.2, ih - 3.2, CR - T - CLR - 1.6, PLATE - 0.1, LIP + 1.3))
    p = p.union(lip)
    p = p.cut(cq.Workplane("XY").center(0, 8).circle(4.2).extrude(PLATE + 1).translate((0, 0, -0.5)))
    p = p.cut(box(0, 13, -0.5, 4.2, 10, PLATE + 1))
    p = p.cut(box(0, 13, 1.2, 8.4, 10, PLATE))
    p = p.cut(box(0, -ih / 2 + 0.8, PLATE - 0.1, 9.0, 3.4, LIP + 1.4))
    return p


TAG_D = 25.8
TAG_T = 1.0
KB = 3.6
KL = 1.8
PLUG = 1.3
FACE = 0.6
BOT_S = 0.70


def squircle(size, r, z0, h):
    return rrect(size, size, r, z0, h)


def logo_tri(scale, cx, cy, z0, h):
    tri = (cq.Workplane("XY").workplane(offset=z0)
           .moveTo((50 - 50) * scale, -(16 - 52) * scale)
           .threePointArc(((56 - 50) * scale, -(19.5 - 52) * scale), ((62 - 50) * scale, -(26 - 52) * scale))
           .lineTo((86 - 50) * scale, -(70 - 52) * scale)
           .threePointArc(((85.5 - 50) * scale, -(81 - 52) * scale), ((77 - 50) * scale, -(86 - 52) * scale))
           .lineTo((23 - 50) * scale, -(86 - 52) * scale)
           .threePointArc(((14.5 - 50) * scale, -(81 - 52) * scale), ((14 - 50) * scale, -(70 - 52) * scale))
           .lineTo((38 - 50) * scale, -(26 - 52) * scale)
           .threePointArc(((44 - 50) * scale, -(19.5 - 52) * scale), ((50 - 50) * scale, -(16 - 52) * scale))
           .close().extrude(h))
    return tri.translate((cx, cy, 0))


def logo_eyes(scale, cx, cy, z0, h):
    e = None
    for ex in (45, 57):
        pill = rrect(8 * scale, 20 * scale, 4 * scale - 0.01, z0, h, (ex - 50) * scale + cx, -(64 - 52) * scale + cy)
        e = pill if e is None else e.union(pill)
    return e


def outline_icon(z0, h):
    body = squircle(34.0, 9.5, z0, h)
    tab = rrect(14.0, 14.0, 7.0, z0, h, 0, 19.0)
    return body.union(tab)


def outline_bot(z0, h):
    return logo_tri(BOT_S, 0, -2.0, z0, h)


def hole_ring(cx, cy):
    return cq.Workplane("XY").center(cx, cy).circle(2.3).extrude(20).translate((0, 0, -5))


def key_icon(name, course):
    base = outline_icon(0, KB)
    base = base.cut(squircle(34.0 - 3.6, 7.7, KB - 1.4, 2))
    base = base.cut(cq.Workplane("XY").workplane(offset=KB - 1.4 - TAG_T).circle(TAG_D / 2).extrude(TAG_T + 0.1))
    base = base.cut(hole_ring(0, 21.0))
    if name:
        base = base.cut(text_solid(name.upper(), 5.0, 0, 2.5, -0.1, 0.5, mirror=True))
    if course:
        base = base.cut(text_solid(course.upper(), 3.2, 0, -6.5, -0.1, 0.5, mirror=True))
    lid = outline_icon(0, KL)
    lid = lid.union(squircle(34.0 - 3.6 - 0.3, 7.55, KL, PLUG))
    lid = lid.cut(hole_ring(0, 21.0))
    face = logo_tri(0.24, 0, -0.5, -0.1, FACE + 0.1).cut(logo_eyes(0.24, 0, -0.5, -0.2, FACE + 0.3))
    lid = lid.cut(face)
    return base, lid


def key_bot(name):
    base = outline_bot(0, KB)
    inner_scale = BOT_S * 0.87
    base = base.cut(logo_tri(inner_scale, 0, -2.0 - 2.4, KB - 1.4, 2))
    base = base.cut(cq.Workplane("XY").workplane(offset=KB - 1.4 - TAG_T).center(0, -11.0).circle(TAG_D / 2).extrude(TAG_T + 0.1))
    base = base.cut(hole_ring(0, 16.5))
    if name:
        base = base.cut(text_solid(name.upper(), 5.0, 0, -9.0, -0.1, 0.5, mirror=True))
    lid = outline_bot(0, KL)
    lid = lid.union(logo_tri(inner_scale - 0.006, 0, -2.0 - 2.4, KL, PLUG))
    lid = lid.cut(hole_ring(0, 16.5))
    eyes = logo_eyes(BOT_S, 0, -2.0, -0.1, FACE + 0.1)
    lid = lid.cut(eyes)
    return base, lid


def save(shape, name):
    cq.exporters.export(shape, os.path.join(OUT, name + ".step"))
    cq.exporters.export(shape, os.path.join(OUT, name + ".stl"), tolerance=0.02, angularTolerance=0.15)
    print("ok", name)


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "nombre":
        n = sys.argv[2]
        c = sys.argv[3] if len(sys.argv) > 3 else ""
        tag = "".join(ch for ch in n.lower() if ch.isalnum()) or "llavero"
        save(key_icon(n, c)[0], f"llavero_icono_base_{tag}")
        save(key_bot(n)[0], f"llavero_bot_base_{tag}")
        sys.exit(0)
    which = sys.argv[1:] or ["lector", "camara", "llaveros"]
    if "lector" in which:
        save(reader_shell(), "lector_frente")
        save(reader_back(), "lector_tapa")
        save(panel_insert(), "lector_panel_negro")
    if "camara" in which:
        save(cam_shell(), "camara_frente")
        save(cam_back(), "camara_tapa")
    if "llaveros" in which:
        names = [("MATEO", "MEC-3A"), ("", "")]
        for n, c in names:
            b, l = key_icon(n, c)
            tag = n.lower() if n else "sin_nombre"
            save(b, f"llavero_icono_base_{tag}")
            if not n:
                save(l, "llavero_icono_tapa")
            bb, bl = key_bot(n)
            save(bb, f"llavero_bot_base_{tag}")
            if not n:
                save(bl, "llavero_bot_tapa")
