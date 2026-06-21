// ponytail: one place to add a stream. schema enum + dropdown + route all read from this.
export const STREAMS = [
  { slug: 'mechatronics', name: 'Mechatronics Engineering' },
  { slug: 'software', name: 'Software Engineering' },
  { slug: 'electrical', name: 'Electrical Engineering' },
  { slug: 'computer', name: 'Computer Engineering' },
  { slug: 'mechanical', name: 'Mechanical Engineering' },
  { slug: 'civil', name: 'Civil Engineering' },
  { slug: 'chemical', name: 'Chemical Engineering' },
  { slug: 'materials', name: 'Materials Engineering' },
  { slug: 'engphys', name: 'Engineering Physics' },
  { slug: 'biomedical', name: 'Biomedical Engineering' },
] as const;

export const STREAM_SLUGS = STREAMS.map((s) => s.slug);
