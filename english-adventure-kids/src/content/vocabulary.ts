import type { Picture, Preposition, ShapeName, TopicId, VocabItem } from './types';

/**
 * Pre A1 Starters vocabulary bank.
 * British English spelling and word choice (mum, trousers, chips, sweets, biscuit...).
 *
 * To add a word: append a row to the matching topic list below. Ids are
 * generated from the topic + word, so keep words unique inside a topic.
 */

type Row = [word: string, translation: string, picture: string | Picture, example?: string, difficulty?: 1 | 2 | 3];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const vowelStart = (w: string) => /^[aeiou]/i.test(w) && !/^(uni|use|eu)/i.test(w);

/** Words that are plural or uncountable and so take no "a/an". */
const NO_ARTICLE = new Set([
  'grapes', 'trousers', 'socks', 'shoes', 'glasses', 'gloves', 'boots', 'eyes', 'ears', 'teeth',
  'chips', 'sweets', 'noodles', 'rice', 'water', 'milk', 'juice', 'bread', 'cheese', 'soup',
  'chocolate', 'ice cream', 'paper', 'paint', 'rain', 'snow', 'wind', 'corn', 'garlic', 'lettuce', 'broccoli',
]);

const PLURALS: Record<string, string> = {
  fish: 'fish', sheep: 'sheep', mouse: 'mice', 'teddy bear': 'teddy bears', strawberry: 'strawberries',
  cherry: 'cherries', potato: 'potatoes', tomato: 'tomatoes', mango: 'mangoes', butterfly: 'butterflies',
  bus: 'buses', box: 'boxes', foot: 'feet', glass: 'glasses', peach: 'peaches', sandwich: 'sandwiches',
};

const plural = (w: string) => PLURALS[w] ?? (/(s|x|ch|sh)$/.test(w) ? `${w}es` : `${w}s`);

function articleFor(word: string): 'a' | 'an' | '' {
  if (NO_ARTICLE.has(word)) return '';
  return vowelStart(word) ? 'an' : 'a';
}

function withArticle(word: string) {
  const a = articleFor(word);
  return a ? `${a} ${word}` : word;
}

const DEFAULT_EXAMPLE: Partial<Record<TopicId, (w: string) => string>> = {
  animals: (w) => `It is ${withArticle(w)}.`,
  fruits: (w) => (articleFor(w) ? `This is ${withArticle(w)}.` : `These are ${w}.`),
  vegetables: (w) => (articleFor(w) ? `This is ${withArticle(w)}.` : `I like ${w}.`),
  toys: (w) => `I have ${withArticle(w)}.`,
  school: (w) => (articleFor(w) ? `This is my ${w}.` : `I need ${w}.`),
  clothes: (w) => (articleFor(w) ? `This is my ${w}.` : `These are my ${w}.`),
  body: (w) => (articleFor(w) ? `This is my ${w}.` : `These are my ${w}.`),
  family: (w) => `This is my ${w}.`,
  food: (w) => `I like ${articleFor(w) ? plural(w) : w}.`,
  house: (w) => `This is the ${w}.`,
  shapes: (w) => `It is ${withArticle(w)}.`,
  actions: (w) => `I can ${w}.`,
};

function build(topic: TopicId, rows: Row[]): VocabItem[] {
  return rows.map(([word, translation, pic, example, difficulty]) => {
    const picture: Picture = typeof pic === 'string' ? { kind: 'emoji', value: pic } : pic;
    const ex = example ?? DEFAULT_EXAMPLE[topic]?.(word) ?? `${word}.`;
    const diff = difficulty ?? (word.length <= 4 ? 1 : word.length <= 7 ? 2 : 3);
    return {
      id: `${topic}.${slug(word)}`,
      word,
      translation,
      topic,
      picture,
      example: ex,
      difficulty: diff,
      article: articleFor(word),
      plural: plural(word),
    };
  });
}

export const COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', yellow: '#facc15', green: '#22c55e', orange: '#f97316',
  purple: '#a855f7', pink: '#f472b6', brown: '#92400e', black: '#1f2937', white: '#ffffff', grey: '#9ca3af',
};

const colorRows: Row[] = [
  ['red', 'merah', { kind: 'color', hex: COLOR_HEX.red }, 'The apple is red.', 1],
  ['blue', 'biru', { kind: 'color', hex: COLOR_HEX.blue }, 'The sky is blue.', 1],
  ['yellow', 'kuning', { kind: 'color', hex: COLOR_HEX.yellow }, 'The banana is yellow.', 1],
  ['green', 'hijau', { kind: 'color', hex: COLOR_HEX.green }, 'The frog is green.', 1],
  ['orange', 'oranye', { kind: 'color', hex: COLOR_HEX.orange }, 'The carrot is orange.', 2],
  ['purple', 'ungu', { kind: 'color', hex: COLOR_HEX.purple }, 'The grapes are purple.', 2],
  ['pink', 'merah muda', { kind: 'color', hex: COLOR_HEX.pink }, 'The flower is pink.', 1],
  ['brown', 'cokelat', { kind: 'color', hex: COLOR_HEX.brown }, 'The bear is brown.', 2],
  ['black', 'hitam', { kind: 'color', hex: COLOR_HEX.black }, 'The cat is black.', 2],
  ['white', 'putih', { kind: 'color', hex: COLOR_HEX.white }, 'The snow is white.', 2],
  ['grey', 'abu-abu', { kind: 'color', hex: COLOR_HEX.grey }, 'The elephant is grey.', 2],
];

const shape = (s: ShapeName, hex: string): Picture => ({ kind: 'shape', shape: s, hex });
const shapeRows: Row[] = [
  ['circle', 'lingkaran', shape('circle', COLOR_HEX.red), 'The sun is a circle.', 1],
  ['square', 'persegi', shape('square', COLOR_HEX.blue), 'The window is a square.', 1],
  ['triangle', 'segitiga', shape('triangle', COLOR_HEX.green), 'It is a triangle.', 2],
  ['rectangle', 'persegi panjang', shape('rectangle', COLOR_HEX.orange), 'The door is a rectangle.', 3],
  ['star', 'bintang', shape('star', COLOR_HEX.yellow), 'I can see a star.', 1],
  ['heart', 'hati', shape('heart', COLOR_HEX.pink), 'It is a pink heart.', 1],
  ['diamond', 'belah ketupat', shape('diamond', COLOR_HEX.purple), 'It is a diamond.', 2],
  ['oval', 'oval', shape('oval', COLOR_HEX.brown), 'An egg is an oval.', 2],
];

export const NUMBER_WORDS = [
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];
const NUMBER_ID = [
  'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh',
  'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas', 'dua puluh',
];
const COUNT_THINGS = ['apples', 'stars', 'balls', 'cats', 'fish', 'birds', 'cars', 'books', 'ducks', 'flowers'];
const numberRows: Row[] = NUMBER_WORDS.map((w, i) => [
  w,
  NUMBER_ID[i],
  { kind: 'number', n: i + 1 },
  i === 0 ? 'I have one ball.' : `I can see ${w} ${COUNT_THINGS[i % COUNT_THINGS.length]}.`,
  i < 10 ? 1 : 2,
]);

const animalRows: Row[] = [
  ['cat', 'kucing', '🐱'], ['dog', 'anjing', '🐶'], ['fish', 'ikan', '🐟'], ['bird', 'burung', '🐦'],
  ['cow', 'sapi', '🐮'], ['horse', 'kuda', '🐴'], ['sheep', 'domba', '🐑'], ['duck', 'bebek', '🦆'],
  ['chicken', 'ayam', '🐔'], ['goat', 'kambing', '🐐'], ['frog', 'katak', '🐸'], ['monkey', 'monyet', '🐵'],
  ['mouse', 'tikus', '🐭'], ['elephant', 'gajah', '🐘'], ['giraffe', 'jerapah', '🦒'], ['lion', 'singa', '🦁'],
  ['tiger', 'harimau', '🐯'], ['zebra', 'zebra', '🦓'], ['crocodile', 'buaya', '🐊'], ['snake', 'ular', '🐍'],
  ['spider', 'laba-laba', '🕷️'], ['hippo', 'kuda nil', '🦛'], ['bear', 'beruang', '🐻'], ['rabbit', 'kelinci', '🐰'],
  ['turtle', 'kura-kura', '🐢'], ['butterfly', 'kupu-kupu', '🦋'], ['penguin', 'penguin', '🐧'],
];

const fruitRows: Row[] = [
  ['apple', 'apel', '🍎'], ['banana', 'pisang', '🍌'], ['orange', 'jeruk', '🍊'], ['grapes', 'anggur', '🍇'],
  ['lemon', 'lemon', '🍋'], ['pear', 'pir', '🍐'], ['pineapple', 'nanas', '🍍'], ['strawberry', 'stroberi', '🍓'],
  ['watermelon', 'semangka', '🍉'], ['cherry', 'ceri', '🍒'], ['mango', 'mangga', '🥭'], ['coconut', 'kelapa', '🥥'],
  ['kiwi', 'kiwi', '🥝'],
];

const vegetableRows: Row[] = [
  ['carrot', 'wortel', '🥕'], ['potato', 'kentang', '🥔'], ['tomato', 'tomat', '🍅'], ['corn', 'jagung', '🌽'],
  ['onion', 'bawang bombai', '🧅'], ['broccoli', 'brokoli', '🥦'], ['cucumber', 'timun', '🥒'],
  ['mushroom', 'jamur', '🍄'], ['garlic', 'bawang putih', '🧄'], ['lettuce', 'selada', '🥬'],
];

const familyRows: Row[] = [
  ['mum', 'ibu', '👩', 'This is my mum.', 1], ['dad', 'ayah', '👨', 'This is my dad.', 1],
  ['brother', 'saudara laki-laki', '👦'], ['sister', 'saudara perempuan', '👧'], ['baby', 'bayi', '👶'],
  ['grandma', 'nenek', '👵'], ['grandpa', 'kakek', '👴'], ['family', 'keluarga', '👨‍👩‍👧', 'I love my family.'],
  ['friend', 'teman', '🧑‍🤝‍🧑', 'She is my friend.'],
];

const greetingRows: Row[] = [
  ['hello', 'halo', '👋', 'Hello! My name is Olly.', 1],
  ['goodbye', 'sampai jumpa', '🙋', 'Goodbye! See you soon.', 2],
  ['good morning', 'selamat pagi', '🌅', 'Good morning, Mum!', 2],
  ['good night', 'selamat malam', '🌙', 'Good night, Dad!', 2],
  ['thank you', 'terima kasih', '🎁', 'Thank you for the present!', 2],
  ['sorry', 'maaf', '😔', 'I am sorry.', 2],
  ['yes', 'ya', '✅', 'Yes, please!', 1],
  ['no', 'tidak', '❌', 'No, thank you.', 1],
];

const bodyRows: Row[] = [
  ['face', 'wajah', '😀'], ['eyes', 'mata', '👀'], ['ear', 'telinga', '👂'], ['nose', 'hidung', '👃'],
  ['mouth', 'mulut', '👄'], ['hand', 'tangan', '✋'], ['arm', 'lengan', '💪'], ['leg', 'kaki', '🦵'],
  ['foot', 'telapak kaki', '🦶'], ['hair', 'rambut', '💇'], ['teeth', 'gigi', '🦷'], ['finger', 'jari', '☝️'],
];

const clothesRows: Row[] = [
  ['T-shirt', 'kaos', '👕', 'This is my T-shirt.', 2], ['dress', 'gaun', '👗'], ['trousers', 'celana panjang', '👖'],
  ['socks', 'kaus kaki', '🧦'], ['shoes', 'sepatu', '👟'], ['hat', 'topi', '👒'], ['cap', 'topi pet', '🧢'],
  ['jacket', 'jaket', '🧥'], ['glasses', 'kacamata', '👓'], ['scarf', 'syal', '🧣'], ['gloves', 'sarung tangan', '🧤'],
  ['boots', 'sepatu bot', '👢'],
];

const toyRows: Row[] = [
  ['ball', 'bola', '⚽', 'I have a red ball.', 1], ['teddy bear', 'boneka beruang', '🧸', 'I love my teddy bear.', 2],
  ['kite', 'layang-layang', '🪁'], ['robot', 'robot', '🤖'], ['car', 'mobil', '🚗'], ['train', 'kereta', '🚂'],
  ['balloon', 'balon', '🎈'], ['bike', 'sepeda', '🚲'], ['boat', 'perahu', '⛵'], ['plane', 'pesawat', '✈️'],
  ['puzzle', 'teka-teki', '🧩'], ['drum', 'drum', '🥁'], ['yo-yo', 'yoyo', '🪀', 'I can play with my yo-yo.', 2],
];

const schoolRows: Row[] = [
  ['book', 'buku', '📕'], ['pen', 'pena', '🖊️'], ['pencil', 'pensil', '✏️'], ['ruler', 'penggaris', '📏'],
  ['bag', 'tas', '🎒'], ['crayon', 'krayon', '🖍️'], ['scissors', 'gunting', '✂️', 'These are my scissors.', 3],
  ['paper', 'kertas', '📄'], ['computer', 'komputer', '💻'], ['clock', 'jam dinding', '🕐'], ['chair', 'kursi', '🪑'],
  ['school', 'sekolah', '🏫', 'I go to school.'],
];

const foodRows: Row[] = [
  ['bread', 'roti', '🍞'], ['cake', 'kue', '🎂'], ['cheese', 'keju', '🧀'], ['egg', 'telur', '🥚'],
  ['ice cream', 'es krim', '🍦', 'I like ice cream.', 2], ['juice', 'jus', '🧃', 'I drink orange juice.'],
  ['milk', 'susu', '🥛', 'I drink milk.'], ['rice', 'nasi', '🍚', 'I eat rice.'], ['water', 'air', '💧', 'I drink water.'],
  ['pizza', 'pizza', '🍕'], ['burger', 'burger', '🍔'], ['chips', 'kentang goreng', '🍟'],
  ['chocolate', 'cokelat', '🍫'], ['sweets', 'permen', '🍬'], ['biscuit', 'biskuit', '🍪'], ['soup', 'sup', '🍲'],
  ['sandwich', 'roti isi', '🥪'], ['noodles', 'mi', '🍜'],
];

const houseRows: Row[] = [
  ['house', 'rumah', '🏠', 'This is my house.'], ['door', 'pintu', '🚪'], ['bed', 'tempat tidur', '🛏️'],
  ['sofa', 'sofa', '🛋️'], ['bath', 'bak mandi', '🛁'], ['TV', 'televisi', '📺', 'I watch TV.', 1],
  ['lamp', 'lampu', '💡'], ['key', 'kunci', '🔑'], ['flower', 'bunga', '🌷', 'The flower is in the garden.'],
  ['tree', 'pohon', '🌳', 'The bird is in the tree.'], ['garden', 'kebun', '🏡', 'I play in the garden.'],
];

const weatherRows: Row[] = [
  ['sun', 'matahari', '☀️', 'The sun is hot.', 1], ['rain', 'hujan', '🌧️', 'I like the rain.', 1],
  ['cloud', 'awan', '☁️', 'The cloud is white.', 1], ['snow', 'salju', '❄️', 'The snow is cold.', 1],
  ['wind', 'angin', '🌬️', 'The wind is strong.', 2], ['rainbow', 'pelangi', '🌈', 'I can see a rainbow.', 2],
  ['hot', 'panas', '🥵', 'It is hot today.', 1], ['cold', 'dingin', '🥶', 'It is cold today.', 1],
];

const actionRows: Row[] = [
  ['run', 'berlari', '🏃'], ['jump', 'melompat', '🤸'], ['swim', 'berenang', '🏊'], ['sing', 'bernyanyi', '🎤'],
  ['dance', 'menari', '💃'], ['read', 'membaca', '📖'], ['write', 'menulis', '✍️'], ['draw', 'menggambar', '🎨'],
  ['eat', 'makan', '😋'], ['drink', 'minum', '🥤'], ['sleep', 'tidur', '😴'], ['walk', 'berjalan', '🚶'],
  ['clap', 'bertepuk tangan', '👏'], ['smile', 'tersenyum', '😊'], ['ride', 'mengendarai', '🚴'],
];

const scene = (prep: Preposition): Picture => ({ kind: 'scene', thing: '⚽', place: '📦', prep });
const prepositionRows: Row[] = [
  ['in', 'di dalam', scene('in'), 'The ball is in the box.', 1],
  ['on', 'di atas', scene('on'), 'The ball is on the box.', 1],
  ['under', 'di bawah', scene('under'), 'The ball is under the box.', 2],
  ['next to', 'di samping', scene('next to'), 'The ball is next to the box.', 2],
];

/** Letters A–Z with an anchor word for phonics ("A is for apple"). */
const ALPHABET: Array<[string, string, string]> = [
  ['A', 'apple', '🍎'], ['B', 'ball', '⚽'], ['C', 'cat', '🐱'], ['D', 'dog', '🐶'], ['E', 'egg', '🥚'],
  ['F', 'fish', '🐟'], ['G', 'grapes', '🍇'], ['H', 'hat', '👒'], ['I', 'ice cream', '🍦'], ['J', 'juice', '🧃'],
  ['K', 'kite', '🪁'], ['L', 'lion', '🦁'], ['M', 'monkey', '🐵'], ['N', 'nose', '👃'], ['O', 'orange', '🍊'],
  ['P', 'pencil', '✏️'], ['Q', 'queen', '👸'], ['R', 'rabbit', '🐰'], ['S', 'sun', '☀️'], ['T', 'tiger', '🐯'],
  ['U', 'umbrella', '☂️'], ['V', 'van', '🚐'], ['W', 'watch', '⌚'], ['X', 'fox', '🦊'], ['Y', 'yo-yo', '🪀'],
  ['Z', 'zebra', '🦓'],
];

const alphabetItems: VocabItem[] = ALPHABET.map(([letter, anchor, emoji]) => ({
  id: `alphabet.${letter.toLowerCase()}`,
  word: letter,
  translation: `huruf ${letter}`,
  topic: 'alphabet',
  picture: { kind: 'letter', letter, emoji },
  example: letter === 'X' ? 'Fox ends with X.' : `${letter} is for ${anchor}.`,
  difficulty: 1,
  article: '',
}));

/** Anchor word for each letter, used by "starts with" questions. */
export const LETTER_ANCHOR: Record<string, { word: string; emoji: string }> = Object.fromEntries(
  ALPHABET.map(([l, word, emoji]) => [l, { word, emoji }]),
);

export const VOCAB: VocabItem[] = [
  ...alphabetItems,
  ...build('colors', colorRows),
  ...build('shapes', shapeRows),
  ...build('numbers', numberRows),
  ...build('animals', animalRows),
  ...build('fruits', fruitRows),
  ...build('vegetables', vegetableRows),
  ...build('family', familyRows),
  ...build('greetings', greetingRows),
  ...build('body', bodyRows),
  ...build('clothes', clothesRows),
  ...build('toys', toyRows),
  ...build('school', schoolRows),
  ...build('food', foodRows),
  ...build('house', houseRows),
  ...build('weather', weatherRows),
  ...build('actions', actionRows),
  ...build('prepositions', prepositionRows),
];

export const VOCAB_BY_ID: Record<string, VocabItem> = Object.fromEntries(VOCAB.map((v) => [v.id, v]));

export function vocab(id: string): VocabItem {
  const v = VOCAB_BY_ID[id];
  if (!v) throw new Error(`Unknown vocab id: ${id}`);
  return v;
}

export function topicWords(topic: TopicId): VocabItem[] {
  return VOCAB.filter((v) => v.topic === topic);
}

/** Ids of words in a topic, sliced (for building stages). */
export function ids(topic: TopicId, from = 0, to?: number): string[] {
  return topicWords(topic).slice(from, to).map((v) => v.id);
}

export { withArticle, articleFor };
