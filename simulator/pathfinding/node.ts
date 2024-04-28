export default class Node {
  public x: number;
  public y: number;
  public walkable: boolean;

  // TODO: explain their usage.
  public parent: Node | undefined;
  public f: number = 0;
  public g: number = 0;
  public h: number = 0;
  public opened: boolean = false;
  public closed: boolean = false;

  constructor(x: number, y: number, walkable: boolean) {
    this.x = x;
    this.y = y;
    this.walkable = walkable;

    this.reset();
  }

  reset() {
    this.parent = undefined;
    this.f = 0;
    this.g = 0;
    this.h = 0;
    this.opened = false;
    this.closed = false;
  }
}
