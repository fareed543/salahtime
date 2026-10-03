import { NgModule } from '@angular/core';
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarX2,
  ChevronRight,
  CircleCheck,
  Clock,
  EllipsisVertical,
  Hash,
  Info,
  ListChecks,
  LucideAngularModule,
  Mail,
  Maximize,
  Minimize,
  Palette,
  Pencil,
  Phone,
  Plus,
  QrCode,
  Sunrise,
  Sunset,
  Tag,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-angular';

/**
 * The app's icon set (Lucide). Only icons registered here are bundled, so add new ones to
 * this list and use them as <lucide-icon name="calendar-days" [size]="18"></lucide-icon>.
 */
export const APP_ICONS = {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarX2,
  ChevronRight,
  CircleCheck,
  Clock,
  EllipsisVertical,
  Hash,
  Info,
  ListChecks,
  Mail,
  Maximize,
  Minimize,
  Palette,
  Pencil,
  Phone,
  Plus,
  QrCode,
  Sunrise,
  Sunset,
  Tag,
  Trash2,
  UserPlus,
  Users,
  X
};

@NgModule({
  imports: [LucideAngularModule.pick(APP_ICONS)],
  exports: [LucideAngularModule]
})
export class AppIconsModule {}
