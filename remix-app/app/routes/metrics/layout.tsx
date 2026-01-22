import { NavLink, Outlet, useLocation } from "react-router";
import { CATEGORY_INFO, type MetricCategory } from "../../types/metrics";

const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];

export default function MetricsLayout() {
  const location = useLocation();
  const isIndex = location.pathname === "/metrics";

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar - Categories */}
      <aside className="lg:w-64 flex-shrink-0">
        <nav className="sticky top-20 space-y-1">
          <NavLink
            to="/metrics"
            end
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-100 dark:bg-gray-800 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
              }`
            }
          >
            All Categories
          </NavLink>
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800 mt-2">
            {categories.map((category) => {
              const info = CATEGORY_INFO[category];
              return (
                <NavLink
                  key={category}
                  to={`/metrics/${category}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-gray-100 dark:bg-gray-800 font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                    }`
                  }
                >
                  <span className={info.color}>{info.icon}</span>
                  {info.label}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
