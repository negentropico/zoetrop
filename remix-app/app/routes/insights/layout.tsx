import { NavLink, Outlet } from "react-router";

export default function InsightsLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Insights</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Analyze correlations between supplements and metrics, and view genetic profile
        </p>
      </div>

      {/* Insights navigation tabs */}
      <nav className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <NavLink
          to="/insights"
          end
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`
          }
        >
          Overview
        </NavLink>
        <NavLink
          to="/insights/correlations"
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`
          }
        >
          Correlations
        </NavLink>
        <NavLink
          to="/insights/genetics"
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`
          }
        >
          Genetics
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}
