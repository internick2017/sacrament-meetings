import Link from 'next/link';
import NavLinks from './NavLinks';

const WARD_NAME = 'Riverside Ward';

export default function Header() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-slate-800 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="text-lg font-semibold">
          {WARD_NAME}
        </Link>
        <p className="text-sm text-slate-300">{today}</p>
      </div>
      <NavLinks />
    </header>
  );
}
