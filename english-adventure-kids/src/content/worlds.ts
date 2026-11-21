import type { ChallengeKind, LevelDef, PlayKind, QAItem, StageDef, TopicId, WorldDef } from './types';
import { ids } from './vocabulary';

/**
 * Curriculum map. A world is a list of stages; each stage introduces a few
 * words and chooses which game families are used in Practice / Play / Challenge.
 * The question generator turns these definitions into concrete questions.
 */

interface StageOpts {
  practice?: ChallengeKind[];
  challenge?: ChallengeKind[];
  boss?: boolean;
  optional?: boolean;
  storyId?: string;
  qa?: QAItem[];
}

const WORD_PRACTICE: ChallengeKind[] = ['listen', 'picture'];
const WORD_CHALLENGE: ChallengeKind[] = ['listen', 'picture', 'sentence', 'qa', 'spell', 'speak'];

function makeWorld(
  index: number,
  meta: Omit<WorldDef, 'id' | 'index' | 'stages' | 'level'>,
  stages: Array<[title: string, vocab: string[], play: PlayKind, objective: string, opts?: StageOpts]>,
): WorldDef {
  const worldId = `w${index}`;
  return {
    id: worldId,
    index,
    level: 'starters',
    ...meta,
    stages: stages.map(([title, vocab, play, objective, opts = {}], i) => ({
      id: `${worldId}-s${i + 1}`,
      worldId,
      title,
      vocab,
      play,
      objective,
      practice: opts.practice ?? WORD_PRACTICE,
      challenge: opts.challenge ?? WORD_CHALLENGE,
      boss: opts.boss,
      optional: opts.optional,
      storyId: opts.storyId,
      qa: opts.qa,
    })),
  };
}

const LETTER_PRACTICE: ChallengeKind[] = ['letter', 'starts'];
const LETTER_CHALLENGE: ChallengeKind[] = ['letter', 'starts', 'letter', 'speak'];
const letters = (from: number, to: number) => ids('alphabet', from, to);

const INTRO_QA: QAItem[] = [
  { question: 'What is your name?', answer: 'My name is Olly.', distractors: ['I am six years old.', 'It is red.'], translation: 'Siapa namamu?' },
  { question: 'How old are you?', answer: 'I am six years old.', distractors: ['My name is Olly.', 'It is a cat.'], translation: 'Berapa umurmu?' },
  { question: 'How are you?', answer: "I'm fine, thank you.", distractors: ['I am a dog.', 'It is blue.'], translation: 'Apa kabar?' },
  { question: 'Do you like apples?', answer: 'Yes, I do.', distractors: ['Yes, it is.', 'I am six.'], translation: 'Apakah kamu suka apel?' },
  { question: 'Who is this?', answer: 'This is my mum.', distractors: ['It is a ball.', 'I am fine.'], translation: 'Siapa ini?' },
];

const CAN_QA: QAItem[] = [
  { question: 'Can you swim?', answer: 'Yes, I can.', distractors: ['Yes, it is.', 'My name is Ann.'], translation: 'Apakah kamu bisa berenang?' },
  { question: 'Can a fish fly?', answer: "No, it can't.", distractors: ['Yes, I do.', 'It is green.'], translation: 'Apakah ikan bisa terbang?' },
  { question: 'What can you do?', answer: 'I can jump.', distractors: ['I am jump.', 'It is a jump.'], translation: 'Apa yang bisa kamu lakukan?' },
];

export const WORLDS: WorldDef[] = [
  makeWorld(1, { name: 'Alphabet Kingdom', emoji: '🏰', from: '#ff9a9e', to: '#fad0c4', topics: ['alphabet'] }, [
    ['Letters A–E', letters(0, 5), 'match', 'Mengenal huruf A–E dan kata awalnya.', { practice: LETTER_PRACTICE, challenge: LETTER_CHALLENGE }],
    ['Letters F–J', letters(5, 10), 'match', 'Mengenal huruf F–J dan kata awalnya.', { practice: LETTER_PRACTICE, challenge: LETTER_CHALLENGE }],
    ['Letters K–O', letters(10, 15), 'missing', 'Mengenal huruf K–O dan kata awalnya.', { practice: LETTER_PRACTICE, challenge: LETTER_CHALLENGE }],
    ['Letters P–T', letters(15, 20), 'match', 'Mengenal huruf P–T dan kata awalnya.', { practice: LETTER_PRACTICE, challenge: LETTER_CHALLENGE }],
    ['Letters U–Z', letters(20, 26), 'missing', 'Mengenal huruf U–Z dan kata awalnya.', { practice: LETTER_PRACTICE, challenge: LETTER_CHALLENGE }],
    ['Alphabet Parade', letters(0, 26), 'match', 'Mengulang seluruh huruf A–Z.', { boss: true, practice: LETTER_PRACTICE, challenge: LETTER_CHALLENGE }],
  ]),
  makeWorld(2, { name: 'Colourful Forest', emoji: '🌳', from: '#a8e063', to: '#56ab2f', topics: ['colors', 'shapes'] }, [
    ['Red, Blue, Yellow, Green', ids('colors', 0, 4), 'color', 'Mengenal warna merah, biru, kuning, hijau.'],
    ['Orange, Purple, Pink, Brown', ids('colors', 4, 8), 'color', 'Mengenal warna oranye, ungu, merah muda, cokelat.'],
    ['Black, White, Grey', ids('colors', 8, 11), 'match', 'Mengenal warna hitam, putih, abu-abu.'],
    ['Circles and Squares', ids('shapes', 0, 4), 'match', 'Mengenal bentuk lingkaran, persegi, segitiga, persegi panjang.'],
    ['Stars and Hearts', ids('shapes', 4, 8), 'missing', 'Mengenal bentuk bintang, hati, belah ketupat, oval.'],
    ['Rainbow Challenge', [...ids('colors'), ...ids('shapes')], 'color', 'Mengulang semua warna dan bentuk.', { boss: true }],
  ]),
  makeWorld(3, { name: 'Animal Island', emoji: '🏝️', from: '#4facfe', to: '#00f2fe', topics: ['animals'] }, [
    ['Pets and Friends', ids('animals', 0, 5), 'match', 'Menyebut hewan peliharaan dan "It is a ...".'],
    ['On the Farm', ids('animals', 5, 10), 'missing', 'Menyebut hewan di peternakan.'],
    ['In the Jungle', ids('animals', 10, 15), 'spell', 'Menyebut hewan hutan dan mengeja kata pendek.'],
    ['Wild Animals', ids('animals', 15, 21), 'match', 'Menyebut hewan liar.'],
    ['Animal Friends', ids('animals', 21, 27), 'spell', 'Menyebut hewan lainnya dan mengeja.'],
    ['Story: The Animal Party', [], 'story', 'Mendengarkan cerita pendek dan menjawab pertanyaan.', { storyId: 'animal-party' }],
    ['Animal Island Quest', ids('animals'), 'missing', 'Mengulang semua nama hewan.', { boss: true }],
  ]),
  makeWorld(4, { name: 'Number Mountain', emoji: '⛰️', from: '#f6d365', to: '#fda085', topics: ['numbers'] }, [
    ['Numbers 1–5', ids('numbers', 0, 5), 'count', 'Mengenal dan menghitung 1–5.', { challenge: ['listen', 'count', 'picture', 'spell', 'speak'] }],
    ['Numbers 6–10', ids('numbers', 5, 10), 'count', 'Mengenal dan menghitung 6–10.', { challenge: ['listen', 'count', 'picture', 'qa', 'speak'] }],
    ['Numbers 11–15', ids('numbers', 10, 15), 'match', 'Mengenal angka 11–15.', { challenge: ['listen', 'count', 'picture', 'speak'] }],
    ['Numbers 16–20', ids('numbers', 15, 20), 'count', 'Mengenal angka 16–20.', { challenge: ['listen', 'count', 'picture', 'speak'] }],
    ['How Many?', ids('numbers'), 'count', 'Mengulang angka 1–20 dan "How many...?".', { boss: true, challenge: ['listen', 'count', 'sentence', 'qa'] }],
  ]),
  makeWorld(5, { name: 'Fruit Village', emoji: '🍓', from: '#ff758c', to: '#ff7eb3', topics: ['fruits', 'vegetables'] }, [
    ['Yummy Fruits', ids('fruits', 0, 5), 'match', 'Menyebut buah-buahan populer.'],
    ['Big Fruits', ids('fruits', 5, 9), 'missing', 'Menyebut buah-buahan lainnya.'],
    ['Tropical Fruits', ids('fruits', 9, 13), 'spell', 'Menyebut buah tropis dan mengeja.'],
    ['Garden Vegetables', ids('vegetables', 0, 5), 'match', 'Menyebut sayuran.'],
    ['More Vegetables', ids('vegetables', 5, 10), 'missing', 'Menyebut sayuran lainnya.'],
    ["Story: Sam's Picnic", [], 'story', 'Mendengarkan cerita dan menjawab pertanyaan.', { storyId: 'fruit-picnic' }],
    ['Market Day', [...ids('fruits'), ...ids('vegetables')], 'match', 'Mengulang buah dan sayuran.', { boss: true }],
  ]),
  makeWorld(6, { name: 'Family Town', emoji: '🏡', from: '#a18cd1', to: '#fbc2eb', topics: ['family', 'greetings'] }, [
    ['My Family', ids('family', 0, 5), 'match', 'Memperkenalkan anggota keluarga ("This is my mum").'],
    ['Grandma and Grandpa', ids('family', 5, 9), 'missing', 'Mengenal kakek, nenek, keluarga, teman.'],
    ['Hello and Goodbye', ids('greetings', 0, 4), 'speak', 'Mengucapkan salam.', { challenge: ['listen', 'picture', 'speak'] }],
    ['Please and Thank You', ids('greetings', 4, 8), 'speak', 'Mengucapkan terima kasih, maaf, ya, tidak.', { challenge: ['listen', 'picture', 'speak'] }],
    ['All About Me', [], 'qa', 'Menjawab pertanyaan perkenalan: nama, umur, kabar.', { qa: INTRO_QA, challenge: ['qa', 'qa', 'speak'] }],
    ['Story: My Family', [], 'story', 'Mendengarkan cerita tentang keluarga.', { storyId: 'my-family' }],
    ['Family Party', [...ids('family'), ...ids('greetings')], 'match', 'Mengulang keluarga dan salam.', { boss: true, qa: INTRO_QA }],
  ]),
  makeWorld(7, { name: 'Body Adventure', emoji: '🧒', from: '#f093fb', to: '#f5576c', topics: ['body', 'clothes'] }, [
    ['Head and Face', ids('body', 0, 6), 'match', 'Menyebut bagian wajah dan "Touch your nose!".', { practice: ['listen', 'instruction'] }],
    ['Arms and Legs', ids('body', 6, 12), 'missing', 'Menyebut anggota tubuh lainnya.', { practice: ['listen', 'instruction'] }],
    ['Getting Dressed', ids('clothes', 0, 6), 'match', 'Menyebut pakaian.'],
    ['Hats and Boots', ids('clothes', 6, 12), 'spell', 'Menyebut pakaian dan mengeja.'],
    ['Dress-up Day', [...ids('body'), ...ids('clothes')], 'missing', 'Mengulang tubuh dan pakaian.', { boss: true }],
  ]),
  makeWorld(8, { name: 'School World', emoji: '🏫', from: '#43e97b', to: '#38f9d7', topics: ['school', 'toys', 'actions'] }, [
    ['In My Bag', ids('school', 0, 6), 'match', 'Menyebut benda sekolah.'],
    ['In the Classroom', ids('school', 6, 12), 'missing', 'Menyebut benda di kelas.'],
    ['My Toys', ids('toys', 0, 6), 'spell', 'Menyebut mainan ("I have a ...").'],
    ['More Toys', ids('toys', 6, 13), 'match', 'Menyebut mainan lainnya.'],
    ['Run and Jump', ids('actions', 0, 5), 'speak', 'Memahami kata kerja dan instruksi.', { practice: ['listen', 'instruction'], qa: CAN_QA }],
    ['Read and Write', ids('actions', 5, 10), 'match', 'Memahami kata kerja kegiatan.', { practice: ['listen', 'instruction'], qa: CAN_QA }],
    ['Clap and Smile', ids('actions', 10, 15), 'missing', 'Memahami kata kerja sehari-hari.', { practice: ['listen', 'instruction'], qa: CAN_QA }],
    ["Story: Tom's Red Ball", [], 'story', 'Mendengarkan cerita dan menjawab pertanyaan.', { storyId: 'red-ball' }],
    ['School Fair', [...ids('school'), ...ids('toys'), ...ids('actions')], 'match', 'Mengulang sekolah, mainan, kata kerja.', { boss: true }],
  ]),
  makeWorld(9, { name: 'Food Paradise', emoji: '🍕', from: '#fccb90', to: '#d57eeb', topics: ['food'] }, [
    ['Breakfast', ids('food', 0, 5), 'match', 'Menyebut makanan sarapan.'],
    ['Drinks', ids('food', 5, 9), 'missing', 'Menyebut minuman dan "I drink ...".'],
    ['Party Food', ids('food', 9, 14), 'spell', 'Menyebut makanan pesta.'],
    ['Lunch Box', ids('food', 14, 18), 'match', 'Menyebut makanan bekal.'],
    ['Story: Lunch Time', [], 'story', 'Mendengarkan cerita tentang makan siang.', { storyId: 'lunch-time' }],
    ['Food Festival', ids('food'), 'missing', 'Mengulang makanan dan minuman.', { boss: true }],
  ]),
  makeWorld(10, { name: 'Adventure City', emoji: '🏙️', from: '#667eea', to: '#764ba2', topics: ['house', 'weather', 'prepositions'] }, [
    ['My House', ids('house', 0, 6), 'match', 'Menyebut benda di rumah.'],
    ['In the Garden', ids('house', 6, 11), 'missing', 'Menyebut benda di rumah dan kebun.'],
    ['Sun and Rain', ids('weather', 0, 4), 'match', 'Menyebut cuaca.'],
    ['Hot and Cold', ids('weather', 4, 8), 'speak', 'Menyebut cuaca lainnya.'],
    ['Where Is the Ball?', ids('prepositions'), 'where', 'Memahami in, on, under, next to.', { practice: ['where', 'listen'], challenge: ['where', 'qa', 'where', 'speak'] }],
    ['Story: A Rainy Day', [], 'story', 'Mendengarkan cerita dan menjawab pertanyaan.', { storyId: 'rainy-day' }],
    ['Grand Adventure', [...ids('house'), ...ids('weather'), ...ids('prepositions')], 'missing', 'Tantangan akhir Adventure City.', { boss: true }],
  ]),
];

export const STAGES: StageDef[] = WORLDS.flatMap((w) => w.stages);
export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries(STAGES.map((s) => [s.id, s]));
export const WORLD_BY_ID: Record<string, WorldDef> = Object.fromEntries(WORLDS.map((w) => [w.id, w]));

/** All vocab ids taught in a world (deduplicated). */
export function worldVocab(worldId: string): string[] {
  const w = WORLD_BY_ID[worldId];
  return [...new Set(w.stages.flatMap((s) => s.vocab))];
}

export function worldTopics(worldId: string): TopicId[] {
  return WORLD_BY_ID[worldId].topics;
}

export const LEVELS: LevelDef[] = [
  {
    id: 'starters',
    name: 'Pre A1 Starters',
    cefr: 'Pre A1',
    goal: 'Mengenali kosakata dasar, memahami instruksi sederhana, menjawab pertanyaan sederhana, membaca kata dan kalimat pendek.',
    topics: ['Alphabet', 'Numbers 1–20', 'Colours', 'Shapes', 'Animals', 'Fruits', 'Vegetables', 'Family', 'Body', 'Toys', 'School', 'Food & Drinks', 'Clothes', 'My House', 'Weather', 'Greetings', 'Actions', 'Instructions', 'Questions & Answers'],
    available: true,
  },
  {
    id: 'movers',
    name: 'A1 Movers',
    cefr: 'A1',
    goal: 'Memahami percakapan sederhana, mendeskripsikan benda dan aktivitas, membuat kalimat pendek.',
    topics: ['Daily Routines', 'Hobbies', 'Sports', 'Places in Town', 'Transportation', 'Time and Days', 'Months and Seasons', 'Feelings', 'Describing People', 'Describing Animals', 'Present Simple', 'Present Continuous', 'Prepositions', "Can / Can't", 'There is / There are', 'Simple Conversations', 'Short Stories', 'Simple Sentences'],
    available: false,
  },
  {
    id: 'flyers',
    name: 'A2 Flyers',
    cefr: 'A2',
    goal: 'Memahami percakapan sehari-hari dan berkomunikasi dengan kalimat yang lebih kompleks.',
    topics: ['Past Simple', 'Future Plans', 'Comparisons', 'Adjectives & Adverbs', 'Everyday Conversations', 'Giving Directions', 'Describing Experiences', 'Short Stories', 'Paragraphs', 'Writing Paragraphs', 'Asking & Answering', 'Listening Comprehension'],
    available: false,
  },
];
