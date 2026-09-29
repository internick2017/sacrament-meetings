'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useT } from '@/lib/i18n/client';
import { activeHref, navFor, type NavItem } from '@/lib/nav';
import type { Role } from '@/lib/types';

function linkClass(isActive: boolean): string {
  return isActive
    ? 'whitespace-nowrap font-semibold text-white underline'
    : 'whitespace-nowrap text-slate-300 hover:text-white';
}

// A panel remembers the pathname it was opened on, so any navigation closes
// it without an effect that resets state after the route changes.
function usePanel(pathname: string) {
  const [openAt, setOpenAt] = useState<string | null>(null);
  const isOpen = openAt === pathname;
  const close = useCallback(() => setOpenAt(null), []);
  const toggle = () => setOpenAt(isOpen ? null : pathname);
  return { isOpen, close, toggle };
}

// Escape closes and hands focus back to the trigger; a press outside the
// container closes without stealing focus.
function useDismiss(
  isOpen: boolean,
  close: () => void,
  container: RefObject<HTMLElement | null>,
  trigger: RefObject<HTMLButtonElement | null>
) {
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      close();
      trigger.current?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) close();
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen, close, container, trigger]);
}

function NavLink({
  item,
  active,
  onClick,
  className = '',
}: {
  item: NavItem;
  active: string | null;
  onClick?: () => void;
  className?: string;
}) {
  const t = useT();
  const isActive = item.href === active;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`${className} ${linkClass(isActive)}`}
    >
      {t(item.label)}
    </Link>
  );
}

function AdminMenu({
  items,
  active,
  pathname,
}: {
  items: NavItem[];
  active: string | null;
  pathname: string;
}) {
  const t = useT();
  const { isOpen, close, toggle } = usePanel(pathname);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useDismiss(isOpen, close, container, trigger);
  const childActive = items.some((item) => item.href === active);

  return (
    <div
      ref={container}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={isOpen}
        aria-controls="admin-menu"
        onClick={toggle}
        className={`flex items-center gap-1 ${linkClass(childActive)}`}
      >
        {t('nav.admin')}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </button>
      <ul
        id="admin-menu"
        hidden={!isOpen}
        className="absolute right-0 z-20 mt-2 min-w-48 rounded border border-slate-700 bg-slate-800 py-1 shadow-lg"
      >
        {items.map((item) => (
          <li key={item.href}>
            <NavLink
              item={item}
              active={active}
              onClick={close}
              className="block px-4 py-2 hover:bg-slate-700"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MobileMenu({
  nav,
  active,
  pathname,
}: {
  nav: ReturnType<typeof navFor>;
  active: string | null;
  pathname: string;
}) {
  const t = useT();
  const { isOpen, close, toggle } = usePanel(pathname);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useDismiss(isOpen, close, container, trigger);

  const list = (items: NavItem[], labelledBy?: string) => (
    <ul aria-labelledby={labelledBy}>
      {items.map((item) => (
        <li key={item.href}>
          <NavLink item={item} active={active} onClick={close} className="block py-2" />
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={container} className="md:hidden">
      <button
        ref={trigger}
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-nav"
        onClick={toggle}
        className="flex items-center gap-2 py-2 text-sm text-slate-200 hover:text-white"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-5 w-5"
        >
          <path d={isOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} />
        </svg>
        {t('nav.menu')}
      </button>
      <div
        id="mobile-nav"
        hidden={!isOpen}
        className="space-y-3 border-t border-slate-700 pb-3 pt-2 text-sm"
      >
        {list(nav.public)}
        {nav.admin.length > 0 ? (
          <div>
            <p
              id="mobile-nav-admin"
              className="text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              {t('nav.admin')}
            </p>
            {list(nav.admin, 'mobile-nav-admin')}
          </div>
        ) : null}
        {list(nav.account)}
      </div>
    </div>
  );
}

export default function NavLinks({ role }: { role: Role | null }) {
  const pathname = usePathname();
  const nav = navFor(role);
  const active = activeHref(pathname);

  return (
    <nav className="bg-slate-900">
      <div className="mx-auto max-w-4xl px-4">
        <div className="hidden items-center justify-between gap-6 py-2 text-sm md:flex">
          <ul className="flex items-center gap-4">
            {nav.public.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={active} />
              </li>
            ))}
          </ul>
          <ul className="flex items-center gap-4">
            {nav.admin.length > 0 ? (
              <li>
                <AdminMenu items={nav.admin} active={active} pathname={pathname} />
              </li>
            ) : null}
            {nav.account.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={active} />
              </li>
            ))}
          </ul>
        </div>
        <MobileMenu nav={nav} active={active} pathname={pathname} />
      </div>
    </nav>
  );
}
