/**
 * Generic Min-Priority Queue backed by a binary heap.
 * Supports secondary tie-breaker (e.g. preferring higher g-score or lower h-score when f is equal).
 */
export interface PriorityNode<T> {
  item: T;
  priority: number;        // Primary key (e.g., f-score: lower is popped first)
  secondaryPriority?: number; // Tie-breaker (e.g., lower h-score or higher g-score)
}

export class PriorityQueue<T> {
  private heap: PriorityNode<T>[] = [];

  constructor() {}

  public get size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public push(item: T, priority: number, secondaryPriority: number = 0): void {
    this.heap.push({ item, priority, secondaryPriority });
    this.bubbleUp(this.heap.length - 1);
  }

  public pop(): T | undefined {
    if (this.isEmpty()) return undefined;
    const top = this.heap[0].item;
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  public peek(): T | undefined {
    return this.isEmpty() ? undefined : this.heap[0].item;
  }

  public clear(): void {
    this.heap = [];
  }

  private compare(a: PriorityNode<T>, b: PriorityNode<T>): number {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Tie-breaker
    const secA = a.secondaryPriority ?? 0;
    const secB = b.secondaryPriority ?? 0;
    return secA - secB;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parentIndex]) < 0) {
        // Swap
        const tmp = this.heap[index];
        this.heap[index] = this.heap[parentIndex];
        this.heap[parentIndex] = tmp;
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < length && this.compare(this.heap[leftChild], this.heap[smallest]) < 0) {
        smallest = leftChild;
      }
      if (rightChild < length && this.compare(this.heap[rightChild], this.heap[smallest]) < 0) {
        smallest = rightChild;
      }

      if (smallest !== index) {
        const tmp = this.heap[index];
        this.heap[index] = this.heap[smallest];
        this.heap[smallest] = tmp;
        index = smallest;
      } else {
        break;
      }
    }
  }
}
