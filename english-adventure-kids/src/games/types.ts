import type { Mood } from '../components/Mascot';
import type { AnswerResult } from '../engine/questions';

export interface Feedback {
  mood: Mood;
  text: string;
}

export interface GameProps<Q> {
  q: Q;
  onDone: (results: AnswerResult[]) => void;
  feedback: (f: Feedback) => void;
}

const PRAISE = ['Great job!', 'Amazing!', 'Well done!', 'Super!', "You're doing great!", 'Fantastic!', 'Brilliant!', 'Yes! Good job!'];
const RETRY = ["Let's try again!", 'Almost! Try again!', 'Good try! One more time!', 'Have another go!'];
const HINT = ['Look! Here it is.', "Here's a little help!"];

const pickOne = (a: string[]) => a[Math.floor(Math.random() * a.length)];
export const praise = () => pickOne(PRAISE);
export const retry = () => pickOne(RETRY);
export const hint = () => pickOne(HINT);
