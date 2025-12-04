// lib/automations/nodes/iconMap.tsx

import {
  Zap,
  Clock,
  DollarSign,
  User,
  Folder,
  Calendar,
  RefreshCw,
  Hourglass,
  TrendingUp,
  Globe,
  GitBranch,
  Route,
  Repeat,
  FolderOpen,
  Plus,
  Minus,
  Edit,
  Bell,
  Mail,
  Tag,
  BarChart,
  Code,
  Search,
  Puzzle,
  Book,
  ArrowUpDown,
  Calculator,
  Check
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export type IconName =
  | 'Zap'
  | 'Clock'
  | 'DollarSign'
  | 'User'
  | 'Folder'
  | 'Calendar'
  | 'RefreshCw'
  | 'Hourglass'
  | 'TrendingUp'
  | 'Globe'
  | 'GitBranch'
  | 'Route'
  | 'Repeat'
  | 'FolderOpen'
  | 'Plus'
  | 'Minus'
  | 'Edit'
  | 'Bell'
  | 'Mail'
  | 'Tag'
  | 'BarChart'
  | 'Code'
  | 'Search'
  | 'Puzzle'
  | 'Book'
  | 'ArrowUpDown'
  | 'Calculator'
  | 'Check';

export const iconMap: Record<IconName, LucideIcon> = {
  Zap,
  Clock,
  DollarSign,
  User,
  Folder,
  Calendar,
  RefreshCw,
  Hourglass,
  TrendingUp,
  Globe,
  GitBranch,
  Route,
  Repeat,
  FolderOpen,
  Plus,
  Minus,
  Edit,
  Bell,
  Mail,
  Tag,
  BarChart,
  Code,
  Search,
  Puzzle,
  Book,
  ArrowUpDown,
  Calculator,
  Check
};

export function getIcon(iconName: string): LucideIcon | null {
  return iconMap[iconName as IconName] || null;
}
















