// Display-name pool for bots added from the lobby. 100 names: 70 English, 20
// Finnish, 10 Spanish. A bot draws a random (but seed-deterministic) name from
// here — see `nextBotName` in `lobby.ts`.

const ENGLISH = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph",
  "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy",
  "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra",
  "Donald", "Ashley", "Steven", "Kimberly", "Andrew", "Emily", "Joshua", "Donna",
  "Kenneth", "Michelle", "Kevin", "Carol", "Brian", "Amanda", "George",
  "Dorothy", "Edward", "Melissa", "Ronald", "Deborah", "Timothy", "Stephanie",
  "Jason", "Rebecca", "Jeffrey", "Laura", "Ryan", "Sharon", "Jacob", "Cynthia",
  "Frank", "Kathleen", "Nicholas", "Amy", "Raymond", "Angela", "Jonathan", "Helen",
  "Stephen", "Anna",
];

const FINNISH = [
  "Eero", "Aino", "Mikko", "Ilmari", "Onni", "Väinö", "Eeva", "Aarne", "Saana",
  "Jukka", "Tuomas", "Pekka", "Marja", "Hannele", "Seppo", "Anneli", "Kaarina",
  "Juhani", "Liisa", "Niilo",
];

const SPANISH = [
  "Mateo", "Sofía", "Santiago", "Valentina", "Diego", "Camila", "Javier",
  "Lucía", "Carlos", "Isabella",
];

/** The full 100-name pool a freshly added bot draws from. */
export const BOT_NAMES: readonly string[] = [...ENGLISH, ...FINNISH, ...SPANISH];
