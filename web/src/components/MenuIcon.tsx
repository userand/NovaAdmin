import {
  Gauge, Settings, User, UserRound, SquareMenu, ListTree, Building2,
  BookMarked, SlidersHorizontal, Bell, FileText, KeyRound, ScrollText, Circle, Users, Contact, Smartphone,
  type LucideIcon,
} from 'lucide-react';

/** 后端菜单 icon 字段(Element 图标名) → lucide 图标映射 */
const iconMap: Record<string, LucideIcon> = {
  Odometer: Gauge,
  Setting: Settings,
  Settings: Settings,
  User: User,
  UserFilled: UserRound,
  Menu: ListTree,
  OfficeBuilding: Building2,
  Collection: BookMarked,
  Slider: SlidersHorizontal,
  Bell: Bell,
  Document: FileText,
  Key: KeyRound,
  Tickets: ScrollText,
  Users: Users,
  Contact: Contact,
  Smartphone: Smartphone,
};

export function MenuIcon({ name, className }: { name?: string; className?: string }) {
  const Comp = (name && iconMap[name]) || SquareMenu;
  return <Comp className={className ?? 'size-4'} />;
}

export { Circle };
