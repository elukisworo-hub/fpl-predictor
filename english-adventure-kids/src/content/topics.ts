import type { Topic, TopicId } from './types';

export const TOPICS: Record<TopicId, Topic> = {
  alphabet: { id: 'alphabet', title: 'Alphabet', titleId: 'Alfabet', objective: 'Mengenal nama huruf A–Z dan bunyi awal kata.' },
  numbers: { id: 'numbers', title: 'Numbers 1–20', titleId: 'Angka 1–20', objective: 'Mengenal, mendengar, dan menghitung angka 1–20.' },
  colors: { id: 'colors', title: 'Colours', titleId: 'Warna', objective: 'Menyebut warna dan menjawab "What colour is it?".' },
  shapes: { id: 'shapes', title: 'Shapes', titleId: 'Bentuk', objective: 'Mengenal nama bentuk dasar.' },
  animals: { id: 'animals', title: 'Animals', titleId: 'Hewan', objective: 'Menyebut nama hewan dan menjawab "What is this?".' },
  fruits: { id: 'fruits', title: 'Fruits', titleId: 'Buah', objective: 'Mengenal nama buah dan mengungkapkan suka.' },
  vegetables: { id: 'vegetables', title: 'Vegetables', titleId: 'Sayuran', objective: 'Mengenal nama sayuran.' },
  family: { id: 'family', title: 'Family', titleId: 'Keluarga', objective: 'Memperkenalkan anggota keluarga ("This is my mum").' },
  greetings: { id: 'greetings', title: 'Greetings', titleId: 'Salam & perkenalan', objective: 'Menyapa, berterima kasih, dan memperkenalkan diri.' },
  body: { id: 'body', title: 'My Body', titleId: 'Anggota tubuh', objective: 'Menyebut anggota tubuh dan mengikuti instruksi "Touch your...".' },
  clothes: { id: 'clothes', title: 'Clothes', titleId: 'Pakaian', objective: 'Menyebut nama pakaian.' },
  toys: { id: 'toys', title: 'Toys', titleId: 'Mainan', objective: 'Menyebut nama mainan ("I have a ...").' },
  school: { id: 'school', title: 'At School', titleId: 'Benda sekolah', objective: 'Menyebut benda di kelas.' },
  food: { id: 'food', title: 'Food & Drinks', titleId: 'Makanan & minuman', objective: 'Menyebut makanan/minuman dan "I like ...".' },
  house: { id: 'house', title: 'My House', titleId: 'Rumahku', objective: 'Menyebut benda di rumah.' },
  weather: { id: 'weather', title: 'Weather', titleId: 'Cuaca', objective: 'Menyebut cuaca sederhana.' },
  actions: { id: 'actions', title: 'Actions', titleId: 'Kata kerja', objective: 'Memahami kata kerja dasar dan instruksi sederhana ("I can ...").' },
  prepositions: { id: 'prepositions', title: 'Where is it?', titleId: 'Kata depan tempat', objective: 'Memahami in, on, under, next to dan menjawab "Where is ...?".' },
};
