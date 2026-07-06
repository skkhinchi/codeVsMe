export type Snippet = {
  id: string;
  label: string;
  code: string;
};

export type SnippetCategory = {
  id: string;
  label: string;
  snippets: Snippet[];
};

export const EXAMPLE_SNIPPETS: Snippet[] = [
  {
    id: 'hello',
    label: 'Hello World',
    code: `// Basic console output
console.log('Hello, world!');

const greet = (name) => \`Hello, \${name}!\`;
console.log(greet('Playground'));`,
  },
  {
    id: 'async',
    label: 'Async / Await',
    code: `async function fetchUser(id) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { id, name: 'Ada Lovelace' };
}

const user = await fetchUser(1);
console.log('User:', user);`,
  },
  {
    id: 'arrays',
    label: 'Array Methods',
    code: `const numbers = [1, 2, 3, 4, 5];

const doubled = numbers.map((n) => n * 2);
const evens = numbers.filter((n) => n % 2 === 0);
const sum = numbers.reduce((acc, n) => acc + n, 0);

console.log('Doubled:', doubled);
console.log('Evens:', evens);
console.log('Sum:', sum);`,
  },
  {
    id: 'errors',
    label: 'Error Handling',
    code: `try {
  const data = JSON.parse('{ invalid json }');
  console.log(data);
} catch (error) {
  console.error('Parse failed:', error.message);
}

console.warn('This is a warning');`,
  },
];

export { DSA_CATEGORIES } from './dsaSnippets';

export const DEFAULT_CODE = EXAMPLE_SNIPPETS[0].code;
