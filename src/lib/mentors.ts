// Mentor directory shared by the homepage mentor-plane section and /mentors.
// `cat` is the headline (field > the individual), `name` is the subtitle.
// Swap faces/names for real verified alumni later; Shivom is first — replace
// `img` with a real photo at /public/mentors/shivom.jpg.
export interface Mentor {
  cat: string;
  name: string;
  img: string;
}

export const MENTORS: Mentor[] = [
  { cat: 'Founder', name: 'Shivom Sharma', img: 'https://i.pravatar.cc/600?img=12' },
  { cat: 'Software', name: 'Aisha Khan', img: 'https://i.pravatar.cc/600?img=5' },
  { cat: 'Hardware', name: 'Marcus Lee', img: 'https://i.pravatar.cc/600?img=13' },
  { cat: 'Medicine', name: 'Priya Patel', img: 'https://i.pravatar.cc/600?img=9' },
  { cat: 'Quant Finance', name: 'Daniel Cohen', img: 'https://i.pravatar.cc/600?img=33' },
  { cat: 'Product', name: 'Sarah Nguyen', img: 'https://i.pravatar.cc/600?img=16' },
  { cat: 'Data Science', name: 'Omar Hassan', img: 'https://i.pravatar.cc/600?img=60' },
  { cat: 'Robotics', name: 'Emily Carter', img: 'https://i.pravatar.cc/600?img=20' },
  { cat: 'Mechanical', name: 'Jason Park', img: 'https://i.pravatar.cc/600?img=51' },
  { cat: 'UX Design', name: 'Hannah Brooks', img: 'https://i.pravatar.cc/600?img=45' },
  { cat: 'Startups', name: 'Raj Mehta', img: 'https://i.pravatar.cc/600?img=68' },
  { cat: 'Electrical', name: 'Chloe Martin', img: 'https://i.pravatar.cc/600?img=47' },
  { cat: 'Consulting', name: 'David Okafor', img: 'https://i.pravatar.cc/600?img=59' },
  { cat: 'Biomedical', name: 'Mia Rossi', img: 'https://i.pravatar.cc/600?img=24' },
  { cat: 'Machine Learning', name: 'Kevin Tran', img: 'https://i.pravatar.cc/600?img=53' },
  { cat: 'Research · PhD', name: 'Laura Simmons', img: 'https://i.pravatar.cc/600?img=44' },
];
