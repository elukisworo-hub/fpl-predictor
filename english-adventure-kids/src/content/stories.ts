import type { Story } from './types';

/** Short picture stories. Add a story here, then reference its id from a stage. */
export const STORIES: Story[] = [
  {
    id: 'animal-party',
    title: 'The Animal Party',
    cover: '🎉',
    pages: [
      { scene: '🐶🐱', text: 'The dog and the cat are friends.' },
      { scene: '🐸💚', text: 'The frog is green. It can jump.' },
      { scene: '🐘💧', text: 'The elephant is big. It likes water.' },
      { scene: '🦁😴', text: 'The lion is tired. Good night, lion!' },
    ],
    questions: [
      { question: 'What colour is the frog?', options: ['green', 'red', 'yellow'], answer: 'green', vocab: ['animals.frog', 'colors.green'] },
      { question: 'What does the elephant like?', options: ['water', 'cake', 'milk'], answer: 'water', vocab: ['animals.elephant', 'food.water'] },
      { question: 'Who is tired?', options: ['the lion', 'the frog', 'the dog'], answer: 'the lion', vocab: ['animals.lion'] },
    ],
  },
  {
    id: 'fruit-picnic',
    title: "Sam's Fruit Picnic",
    cover: '🧺',
    pages: [
      { scene: '👦🧺', text: 'Sam has a picnic in the park.' },
      { scene: '🍎🍎🍎', text: 'He has three apples.' },
      { scene: '🍌', text: 'He has one yellow banana.' },
      { scene: '🐵🍌', text: 'Oh! A monkey takes the banana. Sam laughs.' },
    ],
    questions: [
      { question: 'How many apples?', options: ['three', 'two', 'five'], answer: 'three', vocab: ['fruits.apple', 'numbers.three'] },
      { question: 'What colour is the banana?', options: ['yellow', 'blue', 'pink'], answer: 'yellow', vocab: ['fruits.banana', 'colors.yellow'] },
      { question: 'Who takes the banana?', options: ['a monkey', 'a cat', 'a bird'], answer: 'a monkey', vocab: ['animals.monkey'] },
    ],
  },
  {
    id: 'my-family',
    title: 'My Family',
    cover: '🏠',
    pages: [
      { scene: '👧', text: 'Hello! My name is Lily. I am six.' },
      { scene: '👩👨', text: 'This is my mum and this is my dad.' },
      { scene: '👦', text: 'I have a brother. His name is Ben.' },
      { scene: '👵🎂', text: 'Grandma makes a cake. We love Grandma!' },
    ],
    questions: [
      { question: 'How old is Lily?', options: ['six', 'four', 'ten'], answer: 'six', vocab: ['numbers.six'] },
      { question: "What is her brother's name?", options: ['Ben', 'Tom', 'Sam'], answer: 'Ben', vocab: ['family.brother'] },
      { question: 'What does Grandma make?', options: ['a cake', 'a kite', 'a robot'], answer: 'a cake', vocab: ['family.grandma', 'food.cake'] },
    ],
  },
  {
    id: 'red-ball',
    title: "Tom's Red Ball",
    cover: '⚽',
    pages: [
      { scene: '🧒⚽', text: 'This is Tom. Tom has a red ball.' },
      { scene: '🧒👧', text: 'Tom plays with his friend Ann.' },
      { scene: '⚽🌳', text: 'Oh no! The ball is in the tree.' },
      { scene: '👨⚽😊', text: 'Dad gets the ball. Tom is happy!' },
    ],
    questions: [
      { question: 'What colour is the ball?', options: ['red', 'blue', 'green'], answer: 'red', vocab: ['toys.ball', 'colors.red'] },
      { question: 'Where is the ball?', options: ['in the tree', 'under the bed', 'on the chair'], answer: 'in the tree', vocab: ['prepositions.in', 'house.tree'] },
      { question: 'Who gets the ball?', options: ['Dad', 'Mum', 'Ann'], answer: 'Dad', vocab: ['family.dad'] },
    ],
  },
  {
    id: 'lunch-time',
    title: 'Lunch Time',
    cover: '🍽️',
    pages: [
      { scene: '🍽️', text: 'It is lunch time!' },
      { scene: '👧🍕', text: 'Ann likes pizza.' },
      { scene: '👦🍚🍲', text: 'Ben eats rice and soup.' },
      { scene: '🥛🧃', text: 'Ann drinks milk. Ben drinks juice.' },
    ],
    questions: [
      { question: 'What does Ann like?', options: ['pizza', 'chips', 'eggs'], answer: 'pizza', vocab: ['food.pizza'] },
      { question: 'What does Ben eat?', options: ['rice and soup', 'cake and sweets', 'bread and cheese'], answer: 'rice and soup', vocab: ['food.rice', 'food.soup'] },
      { question: 'What does Ben drink?', options: ['juice', 'milk', 'water'], answer: 'juice', vocab: ['food.juice'] },
    ],
  },
  {
    id: 'rainy-day',
    title: 'A Rainy Day',
    cover: '🌈',
    pages: [
      { scene: '🌧️🏠', text: 'It is raining. Lucy is in the house.' },
      { scene: '🧸🛋️', text: 'Her teddy bear is on the sofa.' },
      { scene: '☀️🌈', text: 'Look! The sun! Lucy can see a rainbow.' },
      { scene: '👧🏡', text: 'Lucy plays in the garden.' },
    ],
    questions: [
      { question: 'Where is the teddy bear?', options: ['on the sofa', 'under the bed', 'in the bath'], answer: 'on the sofa', vocab: ['toys.teddy-bear', 'house.sofa', 'prepositions.on'] },
      { question: 'What can Lucy see?', options: ['a rainbow', 'a train', 'a snake'], answer: 'a rainbow', vocab: ['weather.rainbow'] },
      { question: 'Where does Lucy play?', options: ['in the garden', 'at school', 'in the bath'], answer: 'in the garden', vocab: ['house.garden'] },
    ],
  },
];

export const STORY_BY_ID: Record<string, Story> = Object.fromEntries(STORIES.map((s) => [s.id, s]));
