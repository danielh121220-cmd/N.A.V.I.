import os
import cadquery as cq

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
FONT = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"

L = 200.0
BASE_D, BASE_H = 70.0, 10.0
POST, POST_H = 16.0, 130.0
BAR_D, BAR_H = 20.0, 18.0
INSET = 4.0
TEN, TEN_H, CLR = 10.0, 8.0, 0.25
PEGS = 6
PEG_D, PEG_TILT = 6.0, 12.0
PEG_LENS = (13.0, 26.0)
KNOB_D = 9.0
PEG_Z = 6.0
TEXT = "N.A.V.I  ·  TOCA. LISTO."

POST_X = L / 2 - INSET - POST / 2


def rbox(w, d, h, r):
    return cq.Workplane("XY").box(w, d, h, centered=(True, True, False)).edges("|Z").fillet(r)


def socket(x, z0, depth):
    s = TEN + 2 * CLR
    return cq.Workplane("XY").box(s, s, depth, centered=(True, True, False)).translate((x, 0, z0))


def base():
    b = rbox(L, BASE_D, BASE_H, 8.0).edges(">Z").fillet(2.0)
    for sx in (-1, 1):
        b = b.cut(socket(sx * POST_X, BASE_H - TEN_H - 0.5, TEN_H + 1))
    txt = (cq.Workplane("XZ").workplane(offset=BASE_D / 2 + 0.01)
           .text(TEXT, 5.5, -0.8, combine=False, halign="center", valign="center", fontPath=FONT)
           .translate((0, 0, BASE_H / 2 - 0.4)))
    b = b.cut(txt)
    return b


def post():
    p = rbox(POST, POST, POST_H, 2.0)
    ten = cq.Workplane("XY").box(TEN, TEN, TEN_H, centered=(True, True, False)).edges("|Z").chamfer(0.6)
    p = p.union(ten.translate((0, 0, -TEN_H))).union(ten.translate((0, 0, POST_H)))
    return p


def bar():
    b = rbox(L, BAR_D, BAR_H, 4.0).edges(">Z").fillet(2.5)
    for sx in (-1, 1):
        b = b.cut(socket(sx * POST_X, -0.01, TEN_H + 0.5))
    span = 2 * POST_X - POST - 8.0
    step = span / (PEGS - 1)
    for i in range(PEGS):
        x = -span / 2 + i * step
        PEG_L = PEG_LENS[i % 2]
        y0 = -BAR_D / 2 + 2.0
        peg = cq.Solid.makeCylinder(PEG_D / 2, PEG_L + 2.0 - 3.25, cq.Vector(x, y0, PEG_Z), cq.Vector(0, -1, 0))
        cone = cq.Solid.makeCone(PEG_D / 2, KNOB_D / 2, (KNOB_D - PEG_D) / 2, cq.Vector(x, y0 - (PEG_L + 2.0 - 3.25), PEG_Z), cq.Vector(0, -1, 0))
        cap = cq.Solid.makeCylinder(KNOB_D / 2, 2.0, cq.Vector(x, y0 - (PEG_L + 2.0 - 2.0), PEG_Z), cq.Vector(0, -1, 0))
        unit = cq.Workplane("XY").add(peg).union(cq.Workplane("XY").add(cone)).union(cq.Workplane("XY").add(cap))
        unit = unit.edges(cq.selectors.NearestToPointSelector((x, y0 - PEG_L - 2.0, PEG_Z + KNOB_D / 2))).fillet(0.8)
        unit = unit.rotate((x, -BAR_D / 2, PEG_Z), (x + 1, -BAR_D / 2, PEG_Z), -PEG_TILT)
        b = b.union(unit)
    return b


def save(shape, name):
    cq.exporters.export(shape, os.path.join(OUT, name + ".step"))
    cq.exporters.export(shape, os.path.join(OUT, name + ".stl"), tolerance=0.02, angularTolerance=0.15)
    bb = shape.val().BoundingBox()
    print("ok", name, round(bb.xlen, 1), round(bb.ylen, 1), round(bb.zlen, 1))


if __name__ == "__main__":
    b, p, t = base(), post(), bar()
    save(b, "exhibidor_base")
    save(p, "exhibidor_poste")
    save(t, "exhibidor_barra_ganchos")
    asm = (b.union(p.translate((-POST_X, 0, BASE_H)))
            .union(p.translate((POST_X, 0, BASE_H)))
            .union(t.translate((0, 0, BASE_H + POST_H))))
    save(asm, "exhibidor_ensamblado_vista")
