/** 通用树构建工具 */
export interface TreeNodeBase {
  id: number;
  parentId: number;
  orderNum?: number;
  children?: TreeNodeBase[];
}

export function buildTree<T extends TreeNodeBase>(items: T[], parentId = 0): T[] {
  const map = new Map<number, T & { children: T[] }>();
  items.forEach((item) => map.set(Number(item.id), { ...item, children: [] }));
  const roots: (T & { children: T[] })[] = [];
  map.forEach((node) => {
    const parent = map.get(Number(node.parentId));
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const sortRec = (list: (T & { children: T[] })[]) => {
    list.sort((a, b) => (a.orderNum ?? 0) - (b.orderNum ?? 0));
    list.forEach((n) => sortRec(n.children as (T & { children: T[] })[]));
    return list;
  };
  return sortRec(roots);
}
