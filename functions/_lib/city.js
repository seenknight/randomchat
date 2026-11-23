// City normalization, so "Tehran", "tehran " and "تهران" count as the same city.

// canonical key -> accepted spellings (Persian + English variants)
const ALIASES = {
  tehran: ['تهران', 'tehran', 'teheran'],
  karaj: ['کرج', 'karaj'],
  mashhad: ['مشهد', 'mashhad', 'meshed'],
  isfahan: ['اصفهان', 'isfahan', 'esfahan', 'ispahan'],
  shiraz: ['شیراز', 'shiraz'],
  tabriz: ['تبریز', 'tabriz'],
  ahvaz: ['اهواز', 'ahvaz', 'ahwaz'],
  qom: ['قم', 'qom', 'ghom', 'qum'],
  kermanshah: ['کرمانشاه', 'kermanshah'],
  urmia: ['ارومیه', 'urmia', 'orumiyeh', 'orumieh', 'oroumieh', 'urumiyeh'],
  rasht: ['رشت', 'rasht'],
  zahedan: ['زاهدان', 'zahedan'],
  kerman: ['کرمان', 'kerman'],
  hamedan: ['همدان', 'hamedan', 'hamadan'],
  yazd: ['یزد', 'yazd'],
  ardabil: ['اردبیل', 'ardabil', 'ardebil'],
  bandarabbas: ['بندرعباس', 'bandar abbas', 'bandarabbas'],
  arak: ['اراک', 'arak'],
  zanjan: ['زنجان', 'zanjan'],
  sanandaj: ['سنندج', 'sanandaj'],
  qazvin: ['قزوین', 'qazvin', 'ghazvin', 'kazvin'],
  khorramabad: ['خرم آباد', 'خرم‌آباد', 'khorramabad'],
  gorgan: ['گرگان', 'gorgan'],
  sari: ['ساری', 'sari'],
  bojnord: ['بجنورد', 'bojnord', 'bojnurd'],
  birjand: ['بیرجند', 'birjand'],
  ilam: ['ایلام', 'ilam'],
  shahrekord: ['شهرکرد', 'shahrekord', 'shahr e kord'],
  yasuj: ['یاسوج', 'yasuj', 'yasouj'],
  bushehr: ['بوشهر', 'bushehr', 'bushehr'],
  semnan: ['سمنان', 'semnan'],
  babol: ['بابل', 'babol'],
  amol: ['آمل', 'امل', 'amol'],
  dezful: ['دزفول', 'dezful'],
  abadan: ['آبادان', 'abadan'],
  kish: ['کیش', 'kish'],
  qeshm: ['قشم', 'qeshm', 'ghesm'],
  khoy: ['خوی', 'khoy', 'khoi'],
  maragheh: ['مراغه', 'maragheh', 'maraghe'],
  saveh: ['ساوه', 'saveh'],
  neyshabur: ['نیشابور', 'neyshabur', 'nishapur', 'neishabour'],
  sabzevar: ['سبزوار', 'sabzevar'],
  varamin: ['ورامین', 'varamin'],
  islamshahr: ['اسلامشهر', 'islamshahr', 'eslamshahr'],
  rafsanjan: ['رفسنجان', 'rafsanjan'],
  borujerd: ['بروجرد', 'borujerd', 'boroujerd'],
  malayer: ['ملایر', 'malayer'],
};

// Lowercase, unify Arabic/Persian letter variants, drop ZWNJ/diacritics/punctuation, collapse spaces.
export function cleanCity(input) {
  return String(input ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[‌‍ـً-ٰٟ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const squash = (s) => cleanCity(s).replace(/ /g, '');

const LOOKUP = new Map();
for (const [key, names] of Object.entries(ALIASES)) {
  LOOKUP.set(key, key);
  for (const n of names) LOOKUP.set(squash(n), key);
}

/** Stable key used to compare cities. Returns '' when there is nothing usable. */
export function cityKey(input) {
  const s = squash(input);
  if (!s) return '';
  return LOOKUP.get(s) || s;
}
