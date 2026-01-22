import { NavLink, Outlet } from "react-router";

export default function ProtocolLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Protocol</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage supplement protocols, track version evolution, and monitor cessation progress
        </p>
      </div>

      {/* Protocol navigation tabs */}
      <nav className="flex gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <NavLink
          to="/protocol"
          end
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`
          }
        >
          Overview
        </NavLink>
        <NavLink
          to="/protocol/versions"
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`
          }
        >
          Versions
        </NavLink>
        <NavLink
          to="/protocol/supplements"
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`
          }
        >
          Supplements
        </NavLink>
        <NavLink
          to="/protocol/cessation"
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`
          }
        >
          Cessation
        </NavLink>
        <NavLink
          to="/protocol/compare"
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`
          }
        >
          Compare
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}
