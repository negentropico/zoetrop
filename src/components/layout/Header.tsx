/**
 * Header Component
 *
 * Main navigation header with category tabs.
 */

import { CATEGORY_INFO } from '@/types/metrics';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  currentPath?: string;
}

const categories = Object.values(CATEGORY_INFO);

export function Header({
  title = 'Wellness Tracker',
  subtitle = 'Comprehensive health metrics dashboard',
  currentPath = '/',
}: HeaderProps) {
  const getCategoryPath = (catId: string) => {
    return catId === 'bodyComposition' ? '/body-composition/' : `/${catId}/`;
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/' || currentPath === '';
    }
    return currentPath.startsWith(path);
  };

  return (
    <>
      {/* Header */}
      <header className="bg-blue-600 text-white py-4 shadow-md">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-blue-100 text-sm mt-1">{subtitle}</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            <a
              href="/"
              className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors ${
                isActive('/')
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              Dashboard
            </a>
            {categories.map((cat) => {
              const path = getCategoryPath(cat.id);
              return (
                <a
                  key={cat.id}
                  href={path}
                  className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    isActive(path)
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  {cat.label}
                </a>
              );
            })}
            <a
              href="/import/"
              className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors ml-auto ${
                isActive('/import/')
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              Import Data
            </a>
          </div>
        </div>
      </nav>
    </>
  );
}

export default Header;
