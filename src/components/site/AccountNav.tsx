"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Compass,
  List,
  User,
  CreditCard,
  FileSignature,
  ShieldCheck,
  CircleHelp,
  BadgeCheck,
  Star,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";
import { useGuideProfile, useMe } from "@/lib/data-access";
import { Body, Heading, MenuItem, MenuSection } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { RoleSwitcher } from "./RoleSwitcher";

/** Role-aware account navigation shared by desktop and mobile layouts. */
export type Role = "PARTICIPANT" | "GUIDE" | "ADMIN" | "SUPPORT";

interface NavItem {
  label: string;
  icon: LucideIcon;
  
  href?: string;
}
interface NavGroup 
      <div className="border-b border-border px-2.5 pb-5">
        <Heading as="div" size="large" className="flex items-center gap-2">
          <span>Hi{name ? `, ${name}` : ""}!</span>
          <Image
            src={assetUrl("wave_hand.svg")}
            alt=""
            width={22}
            height={22}
            unoptimized
            className="inline-block h-[22px] w-[22px]"
          />
        </Heading>
        <Body size="small" color="muted" className="mt-0.5">
          {subtitle}
        </Body>
      </div>

      
      <RoleSwitcher onNavigate={onNavigate} />

      
      <nav>
        {groups.map((group, gi) => (
          <MenuSection key={group.label ?? `group-${gi}`} label={group.label} bordered={gi > 0}>
            {group.items.map((item) => (
              <li key={item.label}>
                <MenuItem
                  variant="pill"
                  icon={item.icon}
                  href={item.href}
                  active={
                    Boolean(item.href) &&
                    (pathname === item.href || pathname.startsWith(`${item.href}/`))
                  }
                  onSelect={onNavigate}
                >
                  {item.label}
                </MenuItem>
              </li>
            ))}
          </MenuSection>
        ))}
      </nav>
    </div>
  );
}
