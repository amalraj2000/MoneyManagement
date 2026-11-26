import {
  Briefcase, CalendarClock, CreditCard, Fuel, House, Landmark, Laptop, Plane, Receipt, Repeat,
  ShoppingBag, ShoppingCart, Smartphone, Tag, Utensils, Zap, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  food: Utensils, grocery: ShoppingCart, groceries: ShoppingCart, petrol: Fuel, electricity: Zap,
  recharge: Smartphone, slice: CreditCard, "bank loan": Landmark, "gadget emi": Laptop, emi: CalendarClock,
  shopping: ShoppingBag, travel: Plane, bills: Receipt, rent: House, subscriptions: Repeat,
  salary: Briefcase, freelance: Laptop, business: Briefcase, "bank transfer": Landmark,
};

const GRADIENTS = [
  "from-amber-200 to-orange-400", "from-emerald-200 to-green-400", "from-sky-200 to-blue-400",
  "from-pink-200 to-rose-400", "from-violet-200 to-purple-400", "from-teal-200 to-cyan-400",
  "from-yellow-200 to-amber-400", "from-indigo-200 to-blue-500",
];

export function categoryStyle(category: string) {
  const key = category.toLowerCase();
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { Icon: ICONS[key] ?? Tag, gradient: GRADIENTS[h % GRADIENTS.length] };
}
