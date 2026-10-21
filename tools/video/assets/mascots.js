(function () {
  if (!window.NaviBots) return;

  const round = (d, c, w) => `<path d="${d}" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`;

  const SHAPES = [
    { name: 'Cuadradito', eyes: [[42, 48], [58, 48]], w: 8, h: 20, body: () => '<rect x="16" y="16" width="68" height="68" rx="24"/>' },
    { name: 'Gota', eyes: [[43, 62], [57, 62]], w: 8, h: 19, body: () => '<path d="M50 10C62 28 82 44 82 64C82 82 68 92 50 92C32 92 18 82 18 64C18 44 38 28 50 10Z"/>' },
    { name: 'Huevo', eyes: [[41, 54], [55, 54]], w: 8, h: 20, tilt: -12, pivot: [48, 54], body: () => '<path d="M50 12C70 12 84 42 84 62C84 82 69 92 50 92C31 92 16 82 16 62C16 42 30 12 50 12Z"/>' },
    { name: 'Estrella', eyes: [[45, 53], [55, 53]], w: 6, h: 14, body: c => round('M50 18L60 39L83 42L66 57L71 80L50 69L29 80L34 57L17 42L40 39Z', c, 12) },
    { name: 'Hexágono', eyes: [[43, 50], [57, 50]], w: 8, h: 19, body: c => round('M50 16L78 32L78 68L50 84L22 68L22 32Z', c, 12) },
    { name: 'Corazón', eyes: [[42, 44], [56, 44]], w: 7, h: 17, body: () => '<path d="M50 86C30 72 12 57 12 38C12 25 22 16 34 16C42 16 47 21 50 26C53 21 58 16 66 16C78 16 88 25 88 38C88 57 70 72 50 86Z"/>' },
    { name: 'Fantasma', eyes: [[43, 46], [57, 46]], w: 8, h: 19, body: () => '<path d="M22 50C22 30 34 16 50 16C66 16 78 30 78 50L78 84C74 90 70 90 66 84C62 90 58 90 54 84C50 90 46 90 42 84C38 90 34 90 30 84C26 90 22 90 22 84Z"/>' },
    { name: 'Frijol', eyes: [[44, 40], [56, 40]], w: 7, h: 18, body: () => '<rect x="26" y="12" width="48" height="76" rx="24"/>' },
    { name: 'Domo', eyes: [[44, 56], [58, 56]], w: 8, h: 18, tilt: -8, pivot: [51, 56], body: c => round('M16 76C16 44 31 24 50 24C69 24 84 44 84 76Z', c, 8) },
    { name: 'Flor', eyes: [[44, 48], [56, 48]], w: 7, h: 16, body: () => '<circle cx="50" cy="31" r="19"/><circle cx="69" cy="50" r="19"/><circle cx="50" cy="69" r="19"/><circle cx="31" cy="50" r="19"/><circle cx="50" cy="50" r="20"/>' },
    { name: 'Diamante', eyes: [[44, 48], [56, 48]], w: 7, h: 16, body: c => round('M50 14L84 50L50 86L16 50Z', c, 14) },
    { name: 'Pentágono', eyes: [[43, 53], [57, 53]], w: 8, h: 18, body: c => round('M50 16L83 39L71 80L29 80L17 39Z', c, 12) },
    { name: 'Cruz', eyes: [[44, 48], [56, 48]], w: 6, h: 15, body: () => '<rect x="34" y="12" width="32" height="76" rx="16"/><rect x="12" y="34" width="76" height="32" rx="16"/>' },
    { name: 'Pera', eyes: [[44, 62], [56, 62]], w: 7, h: 16, body: () => '<path d="M50 12C58 12 63 19 63 28C63 35 77 43 79 61C81 79 67 90 50 90C33 90 19 79 21 61C23 43 37 35 37 28C37 19 42 12 50 12Z"/>' },
    { name: 'Burbuja', eyes: [[41, 50], [55, 50]], w: 8, h: 20, tilt: -18, pivot: [48, 50], body: () => '<path d="M50 14C62 12 71 21 78 28C88 37 88 52 84 63C80 75 69 86 54 86C38 88 22 80 16 66C10 52 16 36 26 26C33 19 40 15 50 14Z"/>' },
    { name: 'Embudo', eyes: [[43, 38], [57, 38]], w: 8, h: 18, body: () => '<path d="M50 86C46 86 42 82 38 76L14 32C10 25 15 16 23 16L77 16C85 16 90 25 86 32L62 76C58 82 54 86 50 86Z"/>' },
    { name: 'Pastilla', eyes: [[44, 49], [57, 49]], w: 7, h: 17, tilt: -22, pivot: [50, 50], body: () => '<rect x="10" y="30" width="80" height="40" rx="20" transform="rotate(-22 50 50)"/>' },
    { name: 'Octágono', eyes: [[43, 50], [57, 50]], w: 8, h: 19, body: c => round('M37 16H63L84 37V63L63 84H37L16 63V37Z', c, 10) },
    { name: 'Trébol', eyes: [[44, 52], [56, 52]], w: 7, h: 16, body: () => '<circle cx="50" cy="32" r="21"/><circle cx="31" cy="63" r="21"/><circle cx="69" cy="63" r="21"/><circle cx="50" cy="52" r="18"/>' },
    { name: 'Osito', eyes: [[42, 57], [58, 57]], w: 8, h: 18, body: () => '<circle cx="26" cy="32" r="11"/><circle cx="74" cy="32" r="11"/><ellipse cx="50" cy="58" rx="35" ry="31"/>' },
    { name: 'Cometa', eyes: [[44, 42], [56, 42]], w: 6, h: 15, body: c => round('M50 12L76 44L50 88L24 44Z', c, 12) },
    { name: 'Lágrima', eyes: [[43, 36], [57, 36]], w: 8, h: 18, body: () => '<path d="M50 90C62 72 82 56 82 36C82 18 68 8 50 8C32 8 18 18 18 36C18 56 38 72 50 90Z"/>' },
    { name: 'Semilla', eyes: [[43, 48], [56, 48]], w: 7, h: 17, tilt: 20, pivot: [50, 50], body: () => '<ellipse cx="50" cy="50" rx="27" ry="39" transform="rotate(20 50 50)"/>' },
    { name: 'Escudo', eyes: [[43, 46], [57, 46]], w: 8, h: 18, body: c => round('M50 14L80 24V48C80 67 67 81 50 88C33 81 20 67 20 48V24Z', c, 6) },
    { name: 'Campana', eyes: [[44, 46], [56, 46]], w: 7, h: 16, body: c => round('M50 16C63 16 71 27 71 42V62L81 75H19L29 62V42C29 27 37 16 50 16Z', c, 6) + '<circle cx="50" cy="83" r="7"/>' },
    { name: 'Nubecita', eyes: [[44, 52], [56, 52]], w: 7, h: 16, body: () => '<circle cx="30" cy="58" r="19"/><circle cx="50" cy="44" r="24"/><circle cx="70" cy="58" r="19"/><rect x="30" y="52" width="40" height="25" rx="6"/>' },
    { name: 'Bolo', eyes: [[44, 33], [56, 33]], w: 6, h: 13, body: () => '<circle cx="50" cy="33" r="20"/><ellipse cx="50" cy="66" rx="28" ry="25"/>' },
    { name: 'Dado', eyes: [[43, 49], [57, 49]], w: 8, h: 19, tilt: 12, pivot: [50, 50], body: () => '<rect x="18" y="18" width="64" height="64" rx="18" transform="rotate(12 50 50)"/>' },
    { name: 'Margarita', eyes: [[44, 50], [56, 50]], w: 6, h: 14, body: () => [0, 60, 120, 180, 240, 300].map(a => `<circle cx="${(50 + 24 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(50 + 24 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="15"/>`).join('') + '<circle cx="50" cy="50" r="24"/>' },
    { name: 'Oruga', eyes: [[44, 52], [56, 52]], w: 6, h: 14, body: () => '<circle cx="24" cy="62" r="15"/><circle cx="76" cy="62" r="15"/><circle cx="50" cy="54" r="22"/>' },
    { name: 'Hongo', eyes: [[43, 40], [57, 40]], w: 7, h: 15, body: () => '<path d="M14 52C14 30 30 16 50 16C70 16 86 30 86 52C86 57 83 60 78 60H22C17 60 14 57 14 52Z"/><rect x="34" y="54" width="32" height="32" rx="12"/>' },
    { name: 'Bellota', eyes: [[43, 62], [57, 62]], w: 7, h: 16, body: () => '<rect x="47" y="12" width="6" height="16" rx="3"/><rect x="18" y="26" width="64" height="22" rx="11"/><ellipse cx="50" cy="60" rx="28" ry="28"/>' },
    { name: 'Piedra', eyes: [[44, 50], [58, 50]], w: 8, h: 18, tilt: -6, pivot: [51, 50], body: c => round('M30 24L66 18L84 44L76 76L38 84L16 56Z', c, 16) },
    { name: 'Arco', eyes: [[43, 48], [57, 48]], w: 8, h: 19, body: () => '<path d="M20 86V46C20 28 33 16 50 16C67 16 80 28 80 46V86Z"/>' },
    { name: 'Óvalo', eyes: [[42, 52], [58, 52]], w: 8, h: 18, body: () => '<ellipse cx="50" cy="54" rx="40" ry="30"/>' },
    { name: 'Trapecio', eyes: [[43, 52], [57, 52]], w: 8, h: 18, body: c => round('M32 20H68L84 80H16Z', c, 12) },
    { name: 'Calabaza', eyes: [[43, 56], [57, 56]], w: 7, h: 16, body: () => '<rect x="47" y="12" width="7" height="16" rx="3"/><ellipse cx="34" cy="58" rx="20" ry="28"/><ellipse cx="66" cy="58" rx="20" ry="28"/><ellipse cx="50" cy="58" rx="22" ry="30"/>' },
    { name: 'Muñeco', eyes: [[44, 64], [56, 64]], w: 7, h: 15, body: () => '<circle cx="50" cy="30" r="17"/><circle cx="50" cy="64" r="26"/>' },
    { name: 'Bombilla', eyes: [[43, 42], [57, 42]], w: 7, h: 17, body: () => '<circle cx="50" cy="42" r="28"/><rect x="36" y="58" width="28" height="18" rx="6"/><rect x="40" y="76" width="20" height="10" rx="5"/>' },
    { name: 'Cactus', eyes: [[45, 40], [55, 40]], w: 5, h: 12, body: () => '<rect x="37" y="16" width="26" height="72" rx="13"/><rect x="16" y="38" width="14" height="28" rx="7"/><rect x="70" y="30" width="14" height="26" rx="7"/><rect x="22" y="56" width="20" height="12" rx="6"/><rect x="58" y="46" width="20" height="12" rx="6"/>' }
  ];

  const PAIRS = [
    ['#FF5B5B', 'coral', '#FFFFFF', 'blancos'], ['#1382FD', 'azul', '#FFE14D', 'amarillos'], ['#00C96F', 'verde', '#0E3B2B', 'verde bosque'], ['#FFB300', 'mango', '#3A2A00', 'chocolate'],
    ['#8B5CF6', 'violeta', '#B9FBE0', 'menta'], ['#111114', 'negro', '#7DF9FF', 'cian'], ['#FF7AB6', 'rosa', '#4A0D2E', 'vino'], ['#00B8D9', 'turquesa', '#FFFFFF', 'blancos'],
    ['#FF6A00', 'naranja', '#FFF3B0', 'crema'], ['#5856D6', 'índigo', '#FFB3D6', 'rosados'], ['#34C759', 'lima', '#FFFFFF', 'blancos'], ['#727781', 'gris', '#FFD60A', 'amarillos'],
    ['#E5383B', 'rojo', '#FFE8A3', 'crema'], ['#00A3A3', 'laguna', '#FFE14D', 'amarillos'], ['#A0522D', 'canela', '#FFFFFF', 'blancos'], ['#FFD60A', 'sol', '#1C1C1E', 'negros'],
    ['#0A2540', 'noche', '#5EEAD4', 'aguamarina'], ['#C026D3', 'fucsia', '#FFFFFF', 'blancos'], ['#7FD8F5', 'hielo', '#0B3B5C', 'azul marino'], ['#2E7D32', 'bosque', '#D2F7A4', 'lima'],
    ['#F97316', 'calabaza', '#FFFFFF', 'blancos'], ['#3B82F6', 'cielo', '#FFFFFF', 'blancos'], ['#FDA4AF', 'chicle', '#7F1D1D', 'cereza'], ['#10B981', 'esmeralda', '#FFFFFF', 'blancos'],
    ['#6D28D9', 'uva', '#FDE68A', 'dorados'], ['#334155', 'pizarra', '#F9A8D4', 'rosados'], ['#F59E0B', 'ámbar', '#FFFFFF', 'blancos'], ['#06B6D4', 'cian', '#083344', 'petróleo'],
    ['#DC2626', 'cereza', '#FFFFFF', 'blancos'], ['#84CC16', 'kiwi', '#1A2E05', 'oliva'], ['#8B5732', 'cacao', '#FFD7A8', 'durazno'], ['#1E3A8A', 'marino', '#FFFFFF', 'blancos'],
    ['#F472B6', 'rosado', '#FFFFFF', 'blancos'], ['#14B8A6', 'menta', '#FFFFFF', 'blancos'], ['#FB7185', 'sandía', '#FFFFFF', 'blancos'], ['#A78BFA', 'lavanda', '#2E1065', 'morados'],
    ['#0EA5E9', 'océano', '#FDE047', 'amarillos'], ['#65A30D', 'oliva', '#FFFFFF', 'blancos'], ['#E11D48', 'frambuesa', '#FFE4E6', 'rosa pálido'], ['#4B5563', 'grafito', '#34D399', 'verde neón']
  ];

  const NAMES = ['Chispa', 'Coco', 'Lumi', 'Pixel', 'Tito', 'Nube', 'Kiwi', 'Mango', 'Gala', 'Bolt', 'Zuri', 'Momo', 'Fresa', 'Bambú', 'Cometa', 'Dino', 'Eco', 'Fénix', 'Gomi', 'Hada', 'Iko', 'Jade', 'Koko', 'Lulo', 'Mora', 'Nilo', 'Oli', 'Pipo', 'Quiri', 'Rayo', 'Sol', 'Tuna', 'Uki', 'Vito', 'Wawa', 'Xochi', 'Yaku', 'Zafiro', 'Ámbar', 'Brisa'];

  const COUNT = 40;
  const INFO = [];

  for (let i = 0; i < COUNT; i++) {
    const shape = SHAPES[i % SHAPES.length];
    const [color, colorName, eye, eyeName] = PAIRS[i];
    const key = 'm' + i;
    window.NaviBots.define(key, {
      name: NAMES[i],
      color,
      body: shape.body(color),
      eyes: shape.eyes,
      w: shape.w,
      h: shape.h,
      tilt: shape.tilt || 0,
      pivot: shape.pivot || [50, 50],
      ink: eye
    });
    INFO.push({ index: i, key, number: String(i + 1).padStart(2, '0'), name: NAMES[i], color, colorName, eye, eyes: eyeName, shape: shape.name });
  }

  const wrap = i => ((Number(i) % COUNT) + COUNT) % COUNT;

  window.NaviMascots = {
    COUNT,
    key: i => 'm' + wrap(i),
    info: i => INFO[wrap(i)],
    all: () => INFO.slice(),
    describe(i) {
      const m = INFO[wrap(i)];
      return `${m.shape} ${m.colorName} con ojos ${m.eyes}`;
    }
  };
})();
