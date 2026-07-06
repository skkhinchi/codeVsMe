import type { SnippetCategory } from './snippets';

export const DSA_CATEGORIES: SnippetCategory[] = [
  {
    id: 'arrays',
    label: 'Arrays & Strings',
    snippets: [
      {
        id: 'two-pointers',
        label: 'Two Pointers',
        code: `// Two pointers — sorted array pair sum
function twoSumSorted(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    const sum = nums[left] + nums[right];
    if (sum === target) return [left, right];
    if (sum < target) left += 1;
    else right -= 1;
  }
  return [-1, -1];
}

console.log(twoSumSorted([1, 2, 3, 4, 6], 6)); // [1, 3]`,
      },
      {
        id: 'sliding-window',
        label: 'Sliding Window',
        code: `// Max sum of subarray of size k
function maxSumSubarray(nums, k) {
  let windowSum = 0;
  let maxSum = 0;

  for (let i = 0; i < nums.length; i++) {
    windowSum += nums[i];
    if (i >= k) windowSum -= nums[i - k];
    if (i >= k - 1) maxSum = Math.max(maxSum, windowSum);
  }
  return maxSum;
}

console.log(maxSumSubarray([2, 1, 5, 1, 3, 2], 3)); // 9`,
      },
      {
        id: 'prefix-sum',
        label: 'Prefix Sum',
        code: `// Prefix sum for range queries in O(1)
class PrefixSum {
  constructor(nums) {
    this.prefix = [0];
    for (const n of nums) {
      this.prefix.push(this.prefix.at(-1) + n);
    }
  }

  rangeSum(left, right) {
    return this.prefix[right + 1] - this.prefix[left];
  }
}

const ps = new PrefixSum([1, 2, 3, 4, 5]);
console.log(ps.rangeSum(1, 3)); // 2 + 3 + 4 = 9`,
      },
    ],
  },
  {
    id: 'linked-list',
    label: 'Linked List',
    snippets: [
      {
        id: 'singly-ll',
        label: 'Singly Linked List',
        code: `class ListNode {
  constructor(value = 0, next = null) {
    this.value = value;
    this.next = next;
  }
}

class SinglyLinkedList {
  constructor() {
    this.head = null;
  }

  append(value) {
    const node = new ListNode(value);
    if (!this.head) {
      this.head = node;
      return;
    }
    let curr = this.head;
    while (curr.next) curr = curr.next;
    curr.next = node;
  }

  toArray() {
    const result = [];
    let curr = this.head;
    while (curr) {
      result.push(curr.value);
      curr = curr.next;
    }
    return result;
  }
}

const list = new SinglyLinkedList();
[1, 2, 3, 4].forEach((n) => list.append(n));
console.log(list.toArray());`,
      },
      {
        id: 'doubly-ll',
        label: 'Doubly Linked List',
        code: `class DNode {
  constructor(value = 0, prev = null, next = null) {
    this.value = value;
    this.prev = prev;
    this.next = next;
  }
}

class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
  }

  append(value) {
    const node = new DNode(value);
    if (!this.head) {
      this.head = this.tail = node;
      return;
    }
    node.prev = this.tail;
    this.tail.next = node;
    this.tail = node;
  }

  toArrayForward() {
    const result = [];
    let curr = this.head;
    while (curr) {
      result.push(curr.value);
      curr = curr.next;
    }
    return result;
  }
}

const dll = new DoublyLinkedList();
[10, 20, 30].forEach((n) => dll.append(n));
console.log(dll.toArrayForward());`,
      },
      {
        id: 'reverse-ll',
        label: 'Reverse Linked List',
        code: `class ListNode {
  constructor(value = 0, next = null) {
    this.value = value;
    this.next = next;
  }
}

function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}

function toArray(head) {
  const result = [];
  while (head) {
    result.push(head.value);
    head = head.next;
  }
  return result;
}

const head = new ListNode(1, new ListNode(2, new ListNode(3)));
console.log('Before:', toArray(head));
console.log('After:', toArray(reverseList(head)));`,
      },
      {
        id: 'cycle-detection',
        label: 'Cycle Detection (Floyd)',
        code: `class ListNode {
  constructor(value = 0, next = null) {
    this.value = value;
    this.next = next;
  }
}

function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

const a = new ListNode(1);
const b = new ListNode(2);
const c = new ListNode(3);
a.next = b;
b.next = c;
c.next = b; // cycle

console.log(hasCycle(a)); // true`,
      },
    ],
  },
  {
    id: 'stack-queue',
    label: 'Stack & Queue',
    snippets: [
      {
        id: 'stack',
        label: 'Stack',
        code: `class Stack {
  constructor() {
    this.items = [];
  }

  push(value) {
    this.items.push(value);
  }

  pop() {
    return this.items.pop();
  }

  peek() {
    return this.items.at(-1);
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

const stack = new Stack();
stack.push(1);
stack.push(2);
stack.push(3);
console.log(stack.pop()); // 3
console.log(stack.peek()); // 2`,
      },
      {
        id: 'queue',
        label: 'Queue',
        code: `class Queue {
  constructor() {
    this.items = [];
  }

  enqueue(value) {
    this.items.push(value);
  }

  dequeue() {
    return this.items.shift();
  }

  front() {
    return this.items[0];
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

const queue = new Queue();
queue.enqueue('a');
queue.enqueue('b');
queue.enqueue('c');
console.log(queue.dequeue()); // a
console.log(queue.front()); // b`,
      },
      {
        id: 'deque',
        label: 'Deque',
        code: `class Deque {
  constructor() {
    this.items = [];
  }

  pushFront(value) {
    this.items.unshift(value);
  }

  pushBack(value) {
    this.items.push(value);
  }

  popFront() {
    return this.items.shift();
  }

  popBack() {
    return this.items.pop();
  }
}

const dq = new Deque();
dq.pushBack(1);
dq.pushFront(0);
dq.pushBack(2);
console.log(dq.popFront()); // 0
console.log(dq.popBack()); // 2`,
      },
      {
        id: 'min-stack',
        label: 'Min Stack',
        code: `class MinStack {
  constructor() {
    this.stack = [];
    this.minStack = [];
  }

  push(value) {
    this.stack.push(value);
    const min = this.minStack.at(-1);
    this.minStack.push(min === undefined ? value : Math.min(min, value));
  }

  pop() {
    this.stack.pop();
    this.minStack.pop();
  }

  top() {
    return this.stack.at(-1);
  }

  getMin() {
    return this.minStack.at(-1);
  }
}

const ms = new MinStack();
ms.push(3);
ms.push(1);
ms.push(5);
console.log(ms.getMin()); // 1
ms.pop();
console.log(ms.getMin()); // 1`,
      },
    ],
  },
  {
    id: 'heap',
    label: 'Heap / Priority Queue',
    snippets: [
      {
        id: 'min-heap',
        label: 'Min Heap',
        code: `class MinHeap {
  constructor(values = []) {
    this.heap = [...values];
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.heapifyDown(i);
    }
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap[0];
  }

  push(value) {
    this.heap.push(value);
    this.heapifyUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();
    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.heapifyDown(0);
    return top;
  }

  heapifyUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent] <= this.heap[index]) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }

  heapifyDown(index) {
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      if (left < this.heap.length && this.heap[left] < this.heap[smallest]) smallest = left;
      if (right < this.heap.length && this.heap[right] < this.heap[smallest]) smallest = right;
      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}

const minHeap = new MinHeap([4, 1, 3, 2, 16, 9, 10, 14, 8, 7]);
console.log('Min:', minHeap.peek());
console.log('Pop:', minHeap.pop());
console.log('New min:', minHeap.peek());`,
      },
      {
        id: 'max-heap',
        label: 'Max Heap',
        code: `class MaxHeap {
  constructor(values = []) {
    this.heap = [...values];
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.heapifyDown(i);
    }
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap[0];
  }

  push(value) {
    this.heap.push(value);
    this.heapifyUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();
    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.heapifyDown(0);
    return top;
  }

  heapifyUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent] >= this.heap[index]) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }

  heapifyDown(index) {
    while (true) {
      let largest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      if (left < this.heap.length && this.heap[left] > this.heap[largest]) largest = left;
      if (right < this.heap.length && this.heap[right] > this.heap[largest]) largest = right;
      if (largest === index) break;
      [this.heap[largest], this.heap[index]] = [this.heap[index], this.heap[largest]];
      index = largest;
    }
  }
}

const maxHeap = new MaxHeap([4, 1, 3, 2, 16, 9, 10]);
console.log('Max:', maxHeap.peek());
console.log('Pop:', maxHeap.pop());
console.log('New max:', maxHeap.peek());`,
      },
    ],
  },
  {
    id: 'hash',
    label: 'Hash Map / Set',
    snippets: [
      {
        id: 'frequency-map',
        label: 'Frequency Map',
        code: `function buildFrequencyMap(arr) {
  const freq = new Map();
  for (const item of arr) {
    freq.set(item, (freq.get(item) ?? 0) + 1);
  }
  return freq;
}

const nums = [1, 2, 2, 3, 3, 3];
console.log(Object.fromEntries(buildFrequencyMap(nums)));`,
      },
      {
        id: 'two-sum',
        label: 'Two Sum (Hash Map)',
        code: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [-1, -1];
}

console.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]`,
      },
      {
        id: 'hash-set',
        label: 'Hash Set Pattern',
        code: `function containsDuplicate(nums) {
  const seen = new Set();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}

console.log(containsDuplicate([1, 2, 3, 1])); // true
console.log(containsDuplicate([1, 2, 3, 4])); // false`,
      },
    ],
  },
  {
    id: 'tree',
    label: 'Binary Tree',
    snippets: [
      {
        id: 'tree-node',
        label: 'TreeNode + Build Tree',
        code: `class TreeNode {
  constructor(value = 0, left = null, right = null) {
    this.value = value;
    this.left = left;
    this.right = right;
  }
}

// Build from level-order array (null = missing node)
function buildTree(values) {
  if (!values.length || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let i = 1;
  while (queue.length && i < values.length) {
    const node = queue.shift();
    if (values[i] !== null) {
      node.left = new TreeNode(values[i]);
      queue.push(node.left);
    }
    i += 1;
    if (i < values.length && values[i] !== null) {
      node.right = new TreeNode(values[i]);
      queue.push(node.right);
    }
    i += 1;
  }
  return root;
}

const root = buildTree([3, 9, 20, null, null, 15, 7]);
console.log('Root:', root.value, 'Left:', root.left.value, 'Right:', root.right.value);`,
      },
      {
        id: 'tree-traversals',
        label: 'DFS Traversals',
        code: `class TreeNode {
  constructor(value = 0, left = null, right = null) {
    this.value = value;
    this.left = left;
    this.right = right;
  }
}

const root = new TreeNode(1,
  new TreeNode(2, new TreeNode(4), new TreeNode(5)),
  new TreeNode(3, new TreeNode(6), new TreeNode(7)),
);

function inorder(node, out = []) {
  if (!node) return out;
  inorder(node.left, out);
  out.push(node.value);
  inorder(node.right, out);
  return out;
}

function preorder(node, out = []) {
  if (!node) return out;
  out.push(node.value);
  preorder(node.left, out);
  preorder(node.right, out);
  return out;
}

function postorder(node, out = []) {
  if (!node) return out;
  postorder(node.left, out);
  postorder(node.right, out);
  out.push(node.value);
  return out;
}

console.log('Inorder:  ', inorder(root));
console.log('Preorder: ', preorder(root));
console.log('Postorder:', postorder(root));`,
      },
      {
        id: 'bfs-tree',
        label: 'BFS (Level Order)',
        code: `class TreeNode {
  constructor(value = 0, left = null, right = null) {
    this.value = value;
    this.left = left;
    this.right = right;
  }
}

function levelOrder(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];
  while (queue.length) {
    const levelSize = queue.length;
    const level = [];
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.value);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}

const root = new TreeNode(3,
  new TreeNode(9),
  new TreeNode(20, new TreeNode(15), new TreeNode(7)),
);
console.log(levelOrder(root));`,
      },
      {
        id: 'bst',
        label: 'Binary Search Tree',
        code: `class TreeNode {
  constructor(value = 0, left = null, right = null) {
    this.value = value;
    this.left = left;
    this.right = right;
  }
}

class BST {
  constructor() {
    this.root = null;
  }

  insert(value) {
    this.root = this._insert(this.root, value);
  }

  _insert(node, value) {
    if (!node) return new TreeNode(value);
    if (value < node.value) node.left = this._insert(node.left, value);
    else if (value > node.value) node.right = this._insert(node.right, value);
    return node;
  }

  search(value) {
    let curr = this.root;
    while (curr) {
      if (value === curr.value) return true;
      curr = value < curr.value ? curr.left : curr.right;
    }
    return false;
  }
}

const bst = new BST();
[8, 3, 10, 1, 6, 14].forEach((n) => bst.insert(n));
console.log(bst.search(6)); // true
console.log(bst.search(99)); // false`,
      },
    ],
  },
  {
    id: 'graph',
    label: 'Graph',
    snippets: [
      {
        id: 'adjacency-list',
        label: 'Adjacency List',
        code: `class Graph {
  constructor(directed = false) {
    this.directed = directed;
    this.adj = new Map();
  }

  addVertex(v) {
    if (!this.adj.has(v)) this.adj.set(v, []);
  }

  addEdge(u, v) {
    this.addVertex(u);
    this.addVertex(v);
    this.adj.get(u).push(v);
    if (!this.directed) this.adj.get(v).push(u);
  }

  neighbors(v) {
    return this.adj.get(v) ?? [];
  }
}

const g = new Graph();
g.addEdge('A', 'B');
g.addEdge('A', 'C');
g.addEdge('B', 'D');
console.log('Neighbors of A:', g.neighbors('A'));`,
      },
      {
        id: 'graph-bfs',
        label: 'BFS',
        code: `function bfs(graph, start) {
  const visited = new Set([start]);
  const queue = [start];
  const order = [];

  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    for (const nei of graph[node] ?? []) {
      if (!visited.has(nei)) {
        visited.add(nei);
        queue.push(nei);
      }
    }
  }
  return order;
}

const graph = {
  A: ['B', 'C'],
  B: ['A', 'D', 'E'],
  C: ['A', 'F'],
  D: ['B'],
  E: ['B', 'F'],
  F: ['C', 'E'],
};

console.log(bfs(graph, 'A'));`,
      },
      {
        id: 'graph-dfs',
        label: 'DFS',
        code: `function dfs(graph, start) {
  const visited = new Set();
  const order = [];

  function explore(node) {
    visited.add(node);
    order.push(node);
    for (const nei of graph[node] ?? []) {
      if (!visited.has(nei)) explore(nei);
    }
  }

  explore(start);
  return order;
}

const graph = {
  A: ['B', 'C'],
  B: ['A', 'D', 'E'],
  C: ['A', 'F'],
  D: ['B'],
  E: ['B', 'F'],
  F: ['C', 'E'],
};

console.log(dfs(graph, 'A'));`,
      },
      {
        id: 'dijkstra',
        label: 'Dijkstra (Shortest Path)',
        code: `function dijkstra(graph, start) {
  const dist = {};
  for (const node of Object.keys(graph)) dist[node] = Infinity;
  dist[start] = 0;

  const visited = new Set();

  while (visited.size < Object.keys(graph).length) {
    let u = null;
    for (const node of Object.keys(graph)) {
      if (!visited.has(node) && (u === null || dist[node] < dist[u])) u = node;
    }
    if (u === null || dist[u] === Infinity) break;
    visited.add(u);

    for (const [v, weight] of graph[u]) {
      if (dist[u] + weight < dist[v]) dist[v] = dist[u] + weight;
    }
  }
  return dist;
}

const weightedGraph = {
  A: [['B', 4], ['C', 2]],
  B: [['D', 5]],
  C: [['B', 1], ['D', 8]],
  D: [],
};

console.log(dijkstra(weightedGraph, 'A'));`,
      },
    ],
  },
  {
    id: 'trie',
    label: 'Trie',
    snippets: [
      {
        id: 'trie',
        label: 'Trie (Prefix Tree)',
        code: `class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEnd = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
    }
    node.isEnd = true;
  }

  search(word) {
    const node = this._walk(word);
    return Boolean(node && node.isEnd);
  }

  startsWith(prefix) {
    return this._walk(prefix) !== null;
  }

  _walk(str) {
    let node = this.root;
    for (const ch of str) {
      if (!node.children.has(ch)) return null;
      node = node.children.get(ch);
    }
    return node;
  }
}

const trie = new Trie();
['cat', 'car', 'card'].forEach((w) => trie.insert(w));
console.log(trie.search('car')); // true
console.log(trie.startsWith('ca')); // true
console.log(trie.search('dog')); // false`,
      },
    ],
  },
  {
    id: 'union-find',
    label: 'Union Find (DSU)',
    snippets: [
      {
        id: 'union-find',
        label: 'Disjoint Set Union',
        code: `class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = Array(n).fill(0);
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // path compression
    }
    return this.parent[x];
  }

  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return false;
    if (this.rank[rootA] < this.rank[rootB]) this.parent[rootA] = rootB;
    else if (this.rank[rootA] > this.rank[rootB]) this.parent[rootB] = rootA;
    else {
      this.parent[rootB] = rootA;
      this.rank[rootA] += 1;
    }
    return true;
  }

  connected(a, b) {
    return this.find(a) === this.find(b);
  }
}

const uf = new UnionFind(5);
uf.union(0, 1);
uf.union(1, 2);
console.log(uf.connected(0, 2)); // true
console.log(uf.connected(0, 3)); // false`,
      },
    ],
  },
  {
    id: 'sorting',
    label: 'Sorting & Searching',
    snippets: [
      {
        id: 'binary-search',
        label: 'Binary Search',
        code: `function binarySearch(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

console.log(binarySearch([1, 3, 5, 7, 9, 11], 7)); // 3
console.log(binarySearch([1, 3, 5, 7, 9, 11], 4)); // -1`,
      },
      {
        id: 'merge-sort',
        label: 'Merge Sort',
        code: `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  return merge(mergeSort(arr.slice(0, mid)), mergeSort(arr.slice(mid)));
}

function merge(left, right) {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return result.concat(left.slice(i), right.slice(j));
}

console.log(mergeSort([5, 2, 4, 6, 1, 3]));`,
      },
      {
        id: 'quick-sort',
        label: 'Quick Sort',
        code: `function quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    const pivotIndex = partition(arr, low, high);
    quickSort(arr, low, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, high);
  }
  return arr;
}

function partition(arr, low, high) {
  const pivot = arr[high];
  let i = low;
  for (let j = low; j < high; j++) {
    if (arr[j] < pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i += 1;
    }
  }
  [arr[i], arr[high]] = [arr[high], arr[i]];
  return i;
}

const nums = [5, 2, 4, 6, 1, 3];
quickSort(nums);
console.log(nums);`,
      },
    ],
  },
  {
    id: 'dp',
    label: 'Dynamic Programming',
    snippets: [
      {
        id: 'fib-memo',
        label: 'Fibonacci (Memoization)',
        code: `function fib(n, memo = {}) {
  if (n <= 1) return n;
  if (memo[n] !== undefined) return memo[n];
  memo[n] = fib(n - 1, memo) + fib(n - 2, memo);
  return memo[n];
}

console.log(fib(10)); // 55
console.log(fib(50)); // 12586269025`,
      },
      {
        id: 'knapsack',
        label: '0/1 Knapsack',
        code: `function knapsack(weights, values, capacity) {
  const dp = Array(capacity + 1).fill(0);

  for (let i = 0; i < weights.length; i++) {
    for (let w = capacity; w >= weights[i]; w--) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[capacity];
}

const weights = [1, 2, 3, 4];
const values = [10, 20, 30, 40];
console.log(knapsack(weights, values, 5)); // 50`,
      },
      {
        id: 'lis',
        label: 'Longest Increasing Subsequence',
        code: `function lengthOfLIS(nums) {
  const dp = [];
  for (const n of nums) {
    let left = 0;
    let right = dp.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (dp[mid] < n) left = mid + 1;
      else right = mid;
    }
    dp[left] = n;
  }
  return dp.length;
}

console.log(lengthOfLIS([10, 9, 2, 5, 3, 7, 101, 18])); // 4`,
      },
    ],
  },
  {
    id: 'backtracking',
    label: 'Backtracking',
    snippets: [
      {
        id: 'subsets',
        label: 'Subsets',
        code: `function subsets(nums) {
  const result = [];

  function backtrack(index, path) {
    result.push([...path]);
    for (let i = index; i < nums.length; i++) {
      path.push(nums[i]);
      backtrack(i + 1, path);
      path.pop();
    }
  }

  backtrack(0, []);
  return result;
}

console.log(subsets([1, 2, 3]));`,
      },
      {
        id: 'permutations',
        label: 'Permutations',
        code: `function permute(nums) {
  const result = [];

  function backtrack(path, used) {
    if (path.length === nums.length) {
      result.push([...path]);
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(nums[i]);
      backtrack(path, used);
      path.pop();
      used[i] = false;
    }
  }

  backtrack([], Array(nums.length).fill(false));
  return result;
}

console.log(permute([1, 2, 3]));`,
      },
      {
        id: 'n-queens-count',
        label: 'N-Queens (Count Solutions)',
        code: `function totalNQueens(n) {
  let count = 0;
  const cols = new Set();
  const diag1 = new Set();
  const diag2 = new Set();

  function backtrack(row) {
    if (row === n) {
      count += 1;
      return;
    }
    for (let col = 0; col < n; col++) {
      const d1 = row - col;
      const d2 = row + col;
      if (cols.has(col) || diag1.has(d1) || diag2.has(d2)) continue;
      cols.add(col);
      diag1.add(d1);
      diag2.add(d2);
      backtrack(row + 1);
      cols.delete(col);
      diag1.delete(d1);
      diag2.delete(d2);
    }
  }

  backtrack(0);
  return count;
}

console.log(totalNQueens(4)); // 2
console.log(totalNQueens(8)); // 92`,
      },
    ],
  },
];
