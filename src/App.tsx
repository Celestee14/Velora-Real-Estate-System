import { useEffect, useState, type ReactNode } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────
type Page =
  | "login"
  | "register"
  | "client-home"
  | "property-details"
  | "schedule-viewing"
  | "my-appointments"
  | "appointment-details"
  | "client-profile"
  | "favorites"
  | "admin-dashboard"
  | "admin-properties"
  | "admin-appointments"
  | "admin-reports"
  | "admin-users"
  | "admin-settings"
  | "add-property"
  | "edit-property";

interface Property {
  id: number;
  name: string;
  type: string;
  location: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  description: string;
  image: string;
  images?: string[];
  status: "Available" | "Sold" | "Inactive";
}

interface Appointment {
  id: number;
  clientId: number;
  clientName: string;
  contactNumber: string;
  propertyId: number;
  propertyName: string;
  date: string;
  time: string;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  message?: string;
  assignedAgentId?: number;
  assignedAgentName?: string;
}


interface AppNotification {
  id: string;
  clientId: number;
  appointmentId: number;
  message: string;
  createdAt: string;
  read: boolean;
}

interface Rating {
  id: string;
  appointmentId: number;
  clientId: number;
  clientName: string;
  targetType: "property" | "agent";
  targetId: number;
  targetName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Agent" | "Client";
  status: "Active" | "Inactive";
  contactNumber: string;
}

// Matches the Favorite table from Lab 04 (FavoriteID, ClientID, PropertyID, DateSaved).
interface Favorite {
  id: number;
  clientId: number;
  propertyId: number;
  dateSaved: string;
}

interface ClientProfile {
  name: string;
  email: string;
  contact: string;
}

// ─── Sample Data ────────────────────────────────────────────────────────────
const PROPERTIES_INIT: Property[] = [
  {
    id: 1,
    name: "Sunrise Villa",
    type: "House & Lot",
    location: "Quezon City, Metro Manila",
    price: 8500000,
    bedrooms: 4,
    bathrooms: 3,
    size: 220,
    description:
      "A stunning modern villa featuring an open-plan living area, floor-to-ceiling windows, and a lush private garden. Located in a quiet, gated community with 24/7 security. Perfect for families seeking comfort and style.",
    image:
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=500&fit=crop&auto=format",
    status: "Available",
  },
  {
    id: 2,
    name: "Azure Heights Condo",
    type: "Condominium",
    location: "Makati City, Metro Manila",
    price: 4200000,
    bedrooms: 2,
    bathrooms: 2,
    size: 85,
    description:
      "A premium condominium unit on the 18th floor with panoramic city views. Features a modern kitchen, spacious balcony, and access to world-class amenities including a pool, gym, and function rooms.",
    image:
      "https://images.unsplash.com/photo-1600494448850-6013c64ba722?w=800&h=500&fit=crop&auto=format",
    status: "Available",
  },
  {
    id: 3,
    name: "Green Valley Townhouse",
    type: "Townhouse",
    location: "Pasig City, Metro Manila",
    price: 5800000,
    bedrooms: 3,
    bathrooms: 2,
    size: 150,
    description:
      "An elegantly designed townhouse nestled in a tree-lined subdivision. Comes with a private garage, rooftop terrace, and a cozy study room. Close to schools, hospitals, and major commercial establishments.",
    image:
      "https://images.unsplash.com/photo-1774900132442-e7692caaf285?w=800&h=500&fit=crop&auto=format",
    status: "Available",
  },
  {
    id: 4,
    name: "Pearl Residences",
    type: "Condominium",
    location: "BGC, Taguig City",
    price: 6900000,
    bedrooms: 3,
    bathrooms: 2,
    size: 110,
    description:
      "A luxurious BGC condominium with premium finishes and a stunning cityscape view. Walking distance to major offices, restaurants, and the best shopping destinations in the country.",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=500&fit=crop&auto=format",
    status: "Available",
  },
  {
    id: 5,
    name: "Casa Del Rio",
    type: "House & Lot",
    location: "Antipolo, Rizal",
    price: 11000000,
    bedrooms: 5,
    bathrooms: 4,
    size: 380,
    description:
      "A grand riverside estate offering breathtaking mountain and river views. Features a private pool, entertainment deck, landscaped gardens, and a 3-car garage. Ideal for large families or weekend retreats.",
    image:
      "https://images.unsplash.com/photo-1670589953882-b94c9cb380f5?w=800&h=500&fit=crop&auto=format",
    status: "Available",
  },
  {
    id: 6,
    name: "Metro Urban Flat",
    type: "Apartment",
    location: "Mandaluyong City, Metro Manila",
    price: 2800000,
    bedrooms: 1,
    bathrooms: 1,
    size: 45,
    description:
      "A compact and chic studio-style apartment ideal for young professionals. Features a built-in wardrobe, kitchenette, and fast internet access. Located steps away from MRT stations and major offices.",
    image:
      "https://images.unsplash.com/photo-1764063578185-3d68121b11ff?w=800&h=500&fit=crop&auto=format",
    status: "Available",
  },
];

const APPOINTMENTS_INIT: Appointment[] = [
  {
    id: 1,
    clientId: 3,
    clientName: "Maria Santos",
    contactNumber: "09171234567",
    propertyId: 1,
    propertyName: "Sunrise Villa",
    date: "2026-09-18",
    time: "10:00 AM",
    status: "Confirmed",
    message: "Please prepare the gate pass.",
    assignedAgentId: 2,
    assignedAgentName: "Sarah Gonzales",
  },
  {
    id: 2,
    clientId: 4,
    clientName: "Juan dela Cruz",
    contactNumber: "09281234567",
    propertyId: 2,
    propertyName: "Azure Heights Condo",
    date: "2026-09-20",
    time: "02:00 PM",
    status: "Pending",
    message: "",
    assignedAgentId: 2,
    assignedAgentName: "Sarah Gonzales",
  },
  {
    id: 3,
    clientId: 5,
    clientName: "Ana Reyes",
    contactNumber: "09351234567",
    propertyId: 3,
    propertyName: "Green Valley Townhouse",
    date: "2026-09-15",
    time: "11:00 AM",
    status: "Completed",
    message: "Would love to bring my husband along.",
    assignedAgentId: 2,
    assignedAgentName: "Sarah Gonzales",
  },
  {
    id: 4,
    clientId: 6,
    clientName: "Carlo Mendoza",
    contactNumber: "09461234567",
    propertyId: 4,
    propertyName: "Pearl Residences",
    date: "2026-09-22",
    time: "03:00 PM",
    status: "Pending",
    assignedAgentId: 2,
    assignedAgentName: "Sarah Gonzales",
  },
  {
    id: 5,
    clientId: 7,
    clientName: "Liza Fernandez",
    contactNumber: "09571234567",
    propertyId: 5,
    propertyName: "Casa Del Rio",
    date: "2026-09-10",
    time: "09:00 AM",
    status: "Cancelled",
    assignedAgentId: 2,
    assignedAgentName: "Sarah Gonzales",
  },
];

// A few saved properties for the demo client (Maria), so the Favorites page is not empty at first.
const FAVORITES_INIT: Favorite[] = [
  { id: 1, clientId: 3, propertyId: 1, dateSaved: "2026-11-02" },
  { id: 2, clientId: 3, propertyId: 4, dateSaved: "2026-11-05" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatPrice = (p: number) =>
  "₱" + p.toLocaleString("en-PH");

// Local (not UTC) YYYY-MM-DD, so "today" is correct in every timezone.
const todayLocal = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const nextId = (items: { id: number }[]) => items.reduce((m, i) => Math.max(m, i.id), 0) + 1;

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const CLIENT_PROFILE_INIT: ClientProfile = { name: "", email: "", contact: "" };

// First word of the name, for greetings ("Maria Santos" -> "Maria").
const firstName = (full: string) => full.trim().split(/\s+/)[0] || "there";

// The Velora email server (server/server.mjs) that sends the real reset code to the user's inbox.
const API_URL = "http://localhost:3001";

// Sends the appointment email through the Velora email server.
// If the server is off, the website still works; the email just won't be sent.
const notifyAppointment = async (
  payload: {
    appointmentId: number;
    type: "booked" | "confirmed" | "cancelled" | "completed";
  },
  token: string,
) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/appointments/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      console.error("[VELORA EMAIL] Appointment notification failed:", data?.message || response.statusText);
      return false;
    }
    console.info(`[VELORA EMAIL] ${payload.type} notification sent.`);
    return true;
  } catch (error) {
    console.error("[VELORA EMAIL] Could not reach notification endpoint:", error);
    return false;
  }
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-700 border border-amber-200",
    Confirmed: "bg-blue-100 text-blue-700 border border-blue-200",
    Completed: "bg-green-100 text-green-700 border border-green-200",
    Cancelled: "bg-red-100 text-red-700 border border-red-200",
    Available: "bg-green-100 text-green-700 border border-green-200",
    Sold: "bg-gray-100 text-gray-600 border border-gray-200",
    Inactive: "bg-red-100 text-red-700 border border-red-200",
    Active: "bg-green-100 text-green-700 border border-green-200",
    Admin: "bg-purple-100 text-purple-700 border border-purple-200",
    Agent: "bg-blue-100 text-blue-700 border border-blue-200",
    Client: "bg-teal-100 text-teal-700 border border-teal-200",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
};

// ─── House Icon SVG ───────────────────────────────────────────────────────────
const HouseIcon = ({ size = 40, color = "#ffffff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <path d="M20 5L3 19h5v16h24V19h5L20 5z" fill={color} opacity="0.9" />
    <rect x="15" y="25" width="10" height="10" rx="1" fill={color} opacity="0.5" />
    <rect x="24" y="19" width="6" height="8" rx="1" fill={color} opacity="0.5" />
  </svg>
);

// ─── Property Image (with fallback when the URL is missing or broken) ─────────
const PropertyImage = ({ src, alt, className = "" }: { src: string; alt: string; className?: string }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${className} flex items-center justify-center bg-gradient-to-br from-[#e8f2fc] to-[#c8d6e5]`}
      >
        <HouseIcon size={32} color="#1e3a5f" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
};

// ─── Heart (save to favorites) button ────────────────────────────────────────
const HeartButton = ({
  saved,
  onToggle,
  className = "",
}: {
  saved: boolean;
  onToggle: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={saved}
    aria-label={saved ? "Remove from favorites" : "Save to favorites"}
    title={saved ? "Remove from favorites" : "Save to favorites"}
    className={`w-9 h-9 rounded-full bg-white/95 shadow flex items-center justify-center text-lg transition-all hover:scale-110 ${
      saved ? "text-red-500" : "text-gray-400 hover:text-red-400"
    } ${className}`}
  >
    {saved ? "♥" : "♡"}
  </button>
);

// ─── Client Navbar ────────────────────────────────────────────────────────────

const ClientNav = ({
  active,
  onNav,
  clientName,
}: {
  active: Page;
  onNav: (p: Page) => void;
  clientName: string;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("velora.notifications") || "[]");
    } catch {
      return [];
    }
  });

  const clientId = (() => {
    try {
      return JSON.parse(localStorage.getItem("velora.session") || "null");
    } catch {
      return null;
    }
  })();

  const myNotifications = notifications.filter(
    (n) => n.clientId === clientId
  );

  const unreadCount = myNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    const refresh = () => {
      try {
        setNotifications(
          JSON.parse(localStorage.getItem("velora.notifications") || "[]")
        );
      } catch {
        setNotifications([]);
      }
    };

    window.addEventListener("velora-notifications-updated", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("velora-notifications-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const openNotification = (notification: AppNotification) => {
    const next = notifications.map((item) =>
      item.id === notification.id ? { ...item, read: true } : item
    );

    localStorage.setItem("velora.notifications", JSON.stringify(next));
    setNotifications(next);
    onNav("my-appointments");
  };

  const links: { label: string; page: Page }[] = [
    { label: "Home", page: "client-home" },
    { label: "Properties", page: "client-home" },
    { label: "My Appointments", page: "my-appointments" },
    { label: "Favorites", page: "favorites" },
    { label: "Profile", page: "client-profile" },
  ];

  return (
    <nav className="bg-[#1e3a5f] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* LOGO */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onNav("client-home")}
          >
            <div className="w-9 h-9 bg-[#3a8dde] rounded-lg flex items-center justify-center">
              <HouseIcon size={24} />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Velora
            </span>
          </div>

          {/* DESKTOP NAVIGATION */}
         
{/* DESKTOP NAVIGATION */}

<div className="hidden md:flex items-center gap-3">

  {/* MENU BUTTON */}
  <div className="relative">
    <button
      onClick={() => setMenuOpen(!menuOpen)}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium"
    >
      ☰
      <span>{menuOpen ? "▲" : "▼"}</span>
    </button>

    {menuOpen && (
      <div className="absolute top-12 left-0 w-56 bg-white text-gray-800 rounded-xl shadow-xl border border-gray-200 p-2 z-[70]">
        {links.map((l) => (
          <button
            key={l.label}
            onClick={() => {
              onNav(l.page);
              setMenuOpen(false);
            }}
            className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium hover:bg-blue-50"
          >
            {l.label}
          </button>
        ))}

        <div className="border-t border-gray-200 my-1" />

        {/* LOGOUT INSIDE MENU */}
        <button
          onClick={() => {
            onNav("login");
            setMenuOpen(false);
          }}
          className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
        >
          ↪ Logout
        </button>
      </div>
    )}
  </div>

  {/* NOTIFICATION BELL - SEPARATE */}
  <button
    onClick={() => setNotificationsOpen(!notificationsOpen)}
    className="relative w-10 h-10 rounded-lg hover:bg-white/10 text-xl"
  >
    🔔
    {unreadCount > 0 && (
      <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
        {unreadCount}
      </span>
    )}
  </button>

</div>


          {/* MOBILE NAVIGATION */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              aria-label="Notifications"
              className="relative p-2 rounded-lg hover:bg-white/10 text-lg"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <span className="text-sm text-white/70">
              {clientName.split(" ")[0]}
            </span>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg hover:bg-white/10"
            >
              <div className="space-y-1">
                <div className="w-5 h-0.5 bg-white" />
                <div className="w-5 h-0.5 bg-white" />
                <div className="w-5 h-0.5 bg-white" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE NOTIFICATIONS */}
      {notificationsOpen && (
        <div className="md:hidden bg-white text-gray-800 border-b border-gray-200 shadow-lg">
          <div className="px-4 py-3 font-semibold text-[#1e3a5f]">
            Notifications
          </div>

          {myNotifications.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-gray-500">
              No notifications yet.
            </p>
          ) : (
            myNotifications.slice().reverse().map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => {
                  openNotification(notification);
                  setNotificationsOpen(false);
                }}
                className="block w-full text-left px-4 py-3 border-t border-gray-100 text-sm"
              >
                {notification.message}
                <span className="block text-xs text-gray-400 mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden bg-[#152b47] px-4 py-3 space-y-1">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={() => {
                onNav(l.page);
                setMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10"
            >
              {l.label}
            </button>
          ))}

          <button
            onClick={() => onNav("login")}
            className="block w-full text-left px-4 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};


// ─── Admin Sidebar ────────────────────────────────────────────────────────────
const AdminSidebar = ({
  active,
  onNav,
  collapsed,
  setCollapsed,
  isAgent = false,
}: {
  active: Page;
  onNav: (p: Page) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  isAgent?: boolean;
}) => {
  const allItems: { label: string; page: Page; icon: string }[] = [
    { label: "Dashboard", page: "admin-dashboard", icon: "⊞" },
    { label: "Properties", page: "admin-properties", icon: "🏠" },
    { label: "Appointments", page: "admin-appointments", icon: "📅" },
    { label: "Reports", page: "admin-reports", icon: "📊" },
    { label: "Users", page: "admin-users", icon: "👥" },
    { label: "Settings", page: "admin-settings", icon: "⚙" },
  ];
  const items = isAgent ? allItems.filter((item) => item.page === "admin-appointments") : allItems;
  return (
    <aside
      className={`bg-[#1e3a5f] text-white flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"} min-h-screen shrink-0`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
        <div className="w-8 h-8 bg-[#3a8dde] rounded-lg flex items-center justify-center shrink-0">
          <HouseIcon size={20} />
        </div>
        {!collapsed && (
          <span className="font-bold text-base tracking-tight whitespace-nowrap">{isAgent ? "Velora Agent" : "Velora Admin"}</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded hover:bg-white/10 text-white/70 hover:text-white text-lg"
          title="Toggle sidebar"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2">
        {items.map((item) => (
          <button
            key={item.page}
            onClick={() => onNav(item.page)}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              active === item.page
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <span className="text-base shrink-0">{item.icon}</span>
            {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="px-2 pb-4">
        <button
          onClick={() => onNav("login")}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
        >
          <span className="text-base shrink-0">⎋</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

// ─── Admin Layout ─────────────────────────────────────────────────────────────
const AdminLayout = ({
  children,
  active,
  onNav,
  userName = "Admin User",
  isAgent = false,
}: {
  children: ReactNode;
  active: Page;
  onNav: (p: Page) => void;
  userName?: string;
  isAgent?: boolean;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen bg-[#f4f6f9]">
      <AdminSidebar active={active} onNav={onNav} collapsed={collapsed} setCollapsed={setCollapsed} isAgent={isAgent} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shrink-0">
          <div className="text-sm text-gray-500">
            Welcome back, <span className="text-[#1e3a5f] font-semibold">{userName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-sm font-bold">
              {(userName.trim()[0] || "A").toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

// ─── Forgot Password (inside the login card) ───────────────────────────────────
const ForgotPasswordForm = ({
  onBack,
}: {
  onBack: (message?: string) => void;
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const inputCls =
    "w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all";

  const SERVER_DOWN = "Can't reach the email server. Make sure it is running (pnpm server).";

  const sendCode = async (isResend = false) => {
    const em = (isResend ? email : email.trim()).toLowerCase();
    if (!em) { setError("Please enter your email address."); return; }
    if (!isValidEmail(em)) { setError("Please enter a valid email address."); return; }
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "Could not send the code. Please try again.");
        return;
      }
    } catch {
      setError(SERVER_DOWN);
      return;
    } finally {
      setLoading(false);
    }
    setEmail(em);
    setStep(2);
    if (isResend) setInfo("A new code has been sent.");
  };

  const resetPassword = async () => {
    if (!code.trim() || !newPw || !confirm) { setError("Please fill in all fields."); return; }
    if (code.trim().length !== 6) { setError("Enter the 6-digit code from your email."); return; }
    if (newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPw !== confirm) { setError("Passwords do not match."); return; }
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim(), newPassword: newPw }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "That code is not valid. Please check it and try again.");
        return;
      }
    } catch {
      setError(SERVER_DOWN);
      return;
    } finally {
      setLoading(false);
    }
    onBack("Password updated. You can now sign in with your new password.");
  };

  return (
    <>
      <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">Reset Your Password</h2>
      <p className="text-sm text-gray-500 mb-6">
        {step === 1
          ? "Enter the email you registered with and we'll email you a 6-digit code."
          : "Enter the code, then choose a new password."}
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
      )}
      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && sendCode()}
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>
          <button
            onClick={() => sendCode()}
            disabled={loading}
            className="w-full bg-[#1e3a5f] hover:bg-[#152b47] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-all text-sm shadow-sm"
          >
            {loading ? "Sending..." : "Send Reset Code"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg">
            If an account exists for <strong>{email}</strong>, we sent a 6-digit code to that inbox. Check your spam
            folder too. The code expires in 10 minutes.
          </div>
          {info && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg font-medium">{info}</div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reset Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="6-digit code"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => { setNewPw(e.target.value); setError(""); }}
              placeholder="At least 8 characters"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && resetPassword()}
              placeholder="Re-enter new password"
              className={inputCls}
            />
          </div>
          <button
            onClick={resetPassword}
            disabled={loading}
            className="w-full bg-[#1e3a5f] hover:bg-[#152b47] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-all text-sm shadow-sm"
          >
            {loading ? "Checking..." : "Reset Password"}
          </button>
          <div className="flex justify-between">
            <button
              onClick={() => sendCode(true)}
              disabled={loading}
              className="text-xs text-[#3a8dde] hover:underline font-medium disabled:opacity-60"
            >
              Resend code
            </button>
            <button
              onClick={() => { setStep(1); setCode(""); setNewPw(""); setConfirm(""); setError(""); setInfo(""); }}
              className="text-xs text-[#3a8dde] hover:underline font-medium"
            >
              Use a different email
            </button>
          </div>
        </div>
      )}
      <div className="mt-5 text-center">
        <button onClick={() => onBack()} className="text-sm text-gray-500 hover:text-[#1e3a5f] font-medium">
          &larr; Back to Sign In
        </button>
      </div>
    </>
  );
};

// ─── Screen: Login ────────────────────────────────────────────────────────────
const LoginScreen = ({
  onNav,
  onLogin,
}: {
  onNav: (p: Page) => void;
  onLogin: (email: string, password: string) => Promise<void>;
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setNotice("");
    const em = email.trim().toLowerCase();
    if (!em || !password) { setError("Please enter email and password."); return; }
    setError("");
    setLoading(true);
    try {
      await onLogin(em, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2a4f7f] to-[#1e3a5f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <HouseIcon size={48} color="#ffffff" />
          </div>
          <h1 className="text-3xl font-bold text-white font-serif-display">Velora</h1>
          <p className="text-white/70 mt-1 text-sm">Real Estate Property Viewing System</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {mode === "forgot" ? (
            <ForgotPasswordForm
              onBack={(message) => { setMode("login"); setError(""); setPassword(""); setNotice(message ?? ""); }}
            />
          ) : (
          <>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-6">Sign In to Your Account</h2>
            {notice && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg font-medium">{notice}</div>}
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all" />
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <button onClick={() => { setMode("forgot"); setError(""); setNotice(""); }} className="text-xs text-[#3a8dde] hover:underline font-medium">Forgot Password?</button>
            </div>
            <button onClick={handleLogin} disabled={loading}
              className="w-full mt-5 bg-[#1e3a5f] hover:bg-[#152b47] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-all text-sm shadow-sm">
              {loading ? "Signing In..." : "Sign In"}
            </button>
            <div className="mt-4 text-center">
              <span className="text-sm text-gray-500">Don&apos;t have an account? </span>
              <button onClick={() => onNav("register")} className="text-sm text-[#3a8dde] font-semibold hover:underline">Create Account</button>
            </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Screen: Register ─────────────────────────────────────────────────────────

const RegisterScreen = ({
  onNav,
  onRegister,
}: {
  onNav: (p: Page) => void;
  onRegister: (u: { name: string; email: string; contactNumber: string }, password: string) => Promise<void>;
}) => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", contact: "" });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => onNav("login"), 2000);
    return () => clearTimeout(t);
  }, [success]);

  const handleSubmit = async () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const contact = form.contact.trim();
    if (!name || !email || !form.password || !contact) { setError("Please fill in all fields."); return; }
    if (!isValidEmail(email)) { setError("Please enter a valid email address."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (!/^[0-9+\\-\\s]{7,15}$/.test(contact)) { setError("Please enter a valid contact number."); return; }
    setError("");
    setLoading(true);
    try {
      await onRegister({ name, email, contactNumber: contact }, form.password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2a4f7f] to-[#1e3a5f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3"><HouseIcon size={36} /></div>
          <h1 className="text-2xl font-bold text-white font-serif-display">Velora</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-[#1e3a5f] mb-1">Create Your Account</h2>
          <p className="text-sm text-gray-500 mb-6">Join Velora and start exploring properties.</p>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg font-medium">Account created successfully! Redirecting to login...</div>}
          <div className="space-y-4">
            {[
              { label: "Full Name", key: "name", type: "text", placeholder: "e.g. Maria Santos" },
              { label: "Email Address", key: "email", type: "email", placeholder: "you@example.com" },
              { label: "Password", key: "password", type: "password", placeholder: "At least 8 characters" },
              { label: "Confirm Password", key: "confirm", type: "password", placeholder: "Re-enter password" },
              { label: "Contact Number", key: "contact", type: "tel", placeholder: "09XXXXXXXXX" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label>
                <input type={f.type} value={form[f.key as keyof typeof form]}
                  onChange={(e) => { setForm({ ...form, [f.key]: e.target.value }); setError(""); }}
                  placeholder={f.placeholder} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all" />
              </div>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={success || loading}
            className="w-full mt-5 bg-[#1e3a5f] hover:bg-[#152b47] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-all text-sm">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
          <div className="mt-4 text-center">
            <span className="text-sm text-gray-500">Already have an account? </span>
            <button onClick={() => onNav("login")} className="text-sm text-[#3a8dde] font-semibold hover:underline">Sign In</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Screen: Client Home ───────────────────────────────────────────────────────

const ClientHomeScreen = ({
  onNav,
  properties,
  onSelectProperty,
  clientName,
  favoriteIds,
  onToggleFavorite,
}: {
  onNav: (p: Page) => void;
  properties: Property[];
  onSelectProperty: (p: Property) => void;
  clientName: string;
  favoriteIds: number[];
  onToggleFavorite: (propertyId: number) => void;
}) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [priceSort, setPriceSort] = useState("Default");
  const [bedroomFilter, setBedroomFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("");

  const types = [
    "All",
    "House & Lot",
    "Condominium",
    "Townhouse",
    "Apartment",
  ];

  // FILTER AND SORT PROPERTIES
  const filtered = properties
    .filter((p) => p.status === "Available")

    // PROPERTY TYPE FILTER
    .filter(
      (p) => typeFilter === "All" || p.type === typeFilter
    )

    // SEARCH BY NAME OR LOCATION
    .filter(
      (p) =>
        search.trim() === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase())
    )

    // LOCATION FILTER
    .filter(
      (p) =>
        locationFilter.trim() === "" ||
        p.location.toLowerCase().includes(locationFilter.toLowerCase())
    )

    // BEDROOM FILTER
    .filter((p) => {
      if (bedroomFilter === "All") return true;

      if (bedroomFilter === "4+") {
        return Number(p.bedrooms) >= 4;
      }

      return Number(p.bedrooms) === Number(bedroomFilter);
    })

    // PRICE SORTING
    .sort((a, b) => {
      if (priceSort === "Low to High") {
        return Number(a.price) - Number(b.price);
      }

      if (priceSort === "High to Low") {
        return Number(b.price) - Number(a.price);
      }

      return 0;
    });

  // CLEAR ALL FILTERS
  const clearFilters = () => {
    setSearch("");
    setTypeFilter("All");
    setPriceSort("Default");
    setBedroomFilter("All");
    setLocationFilter("");
  };

  return (
    <div className="bg-[#f4f6f9] min-h-screen">
      <ClientNav
        active="client-home"
        onNav={onNav}
        clientName={clientName}
      />

      {/* HERO SECTION */}
      <div className="bg-[#1e3a5f] text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold font-serif-display mb-2">
            Find Your Perfect Property
          </h1>

          <p className="text-white/70 mb-6">
            Welcome back,{" "}
            <strong className="text-white">
              {firstName(clientName)}
            </strong>
            ! Browse our curated listings and schedule a viewing today.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by property name or location..."
              className="flex-1 px-4 py-3 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a8dde] shadow"
            />

            <button
              onClick={() => {
                document.getElementById("property-listings")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
              className="bg-[#3a8dde] hover:bg-[#2a7dcb] px-6 py-3 rounded-lg text-sm font-semibold transition-all shadow"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ADVANCED FILTERS */}
        <div
          id="property-listings"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-bold text-[#1e3a5f]">
                Find Your Ideal Property
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Filter properties based on your preferences.
              </p>
            </div>

            <button
              onClick={clearFilters}
              className="text-sm text-red-500 font-semibold hover:underline"
            >
              Clear All Filters
            </button>
          </div>

          {/* PROPERTY TYPE */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Property Type
            </label>

            <div className="flex gap-2 flex-wrap">
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    typeFilter === t
                      ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#3a8dde] hover:text-[#3a8dde]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* OTHER FILTERS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* PRICE SORT */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sort by Price
              </label>

              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#3a8dde]/30"
              >
                <option value="Default">Default</option>
                <option value="Low to High">
                  Price: Low to High
                </option>
                <option value="High to Low">
                  Price: High to Low
                </option>
              </select>
            </div>

            {/* BEDROOM FILTER */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bedrooms
              </label>

              <select
                value={bedroomFilter}
                onChange={(e) => setBedroomFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#3a8dde]/30"
              >
                <option value="All">Any Bedrooms</option>
                <option value="1">1 Bedroom</option>
                <option value="2">2 Bedrooms</option>
                <option value="3">3 Bedrooms</option>
                <option value="4+">4+ Bedrooms</option>
              </select>
            </div>

            {/* LOCATION FILTER */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Location
              </label>

              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Enter city or location..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3a8dde]/30"
              />
            </div>
          </div>

          {/* FILTER RESULTS */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Showing{" "}
              <strong className="text-[#1e3a5f]">
                {filtered.length}
              </strong>{" "}
              available properties
            </span>

            <span className="text-xs text-gray-400">
              Updated automatically
            </span>
          </div>
        </div>

        {/* PROPERTY CARDS */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">🏠</div>

            <h3 className="font-bold text-[#1e3a5f] text-lg">
              No Properties Found
            </h3>

            <p className="text-gray-500 text-sm mt-2">
              Try changing your filters or search for another property.
            </p>

            <button
              onClick={clearFilters}
              className="mt-5 px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152b47]"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group"
              >
                {/* PROPERTY IMAGE */}
                <div className="relative h-52 bg-gray-100 overflow-hidden">
                  <PropertyImage
                    src={property.image}
                    alt={property.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  <div className="absolute top-3 left-3">
                    <span className="bg-white/90 text-[#1e3a5f] text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                      {property.type}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      Available
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3">
                    <HeartButton
                      saved={favoriteIds.includes(property.id)}
                      onToggle={() => onToggleFavorite(property.id)}
                    />
                  </div>
                </div>

                {/* PROPERTY DETAILS */}
                <div className="p-5">
                  <h3 className="font-bold text-[#1e3a5f] text-lg mb-1">
                    {property.name}
                  </h3>

                  <p className="text-gray-500 text-sm mb-2 flex items-center gap-1">
                    <span>📍</span>
                    {property.location}
                  </p>

                  <p className="text-[#3a8dde] font-bold text-xl mb-3">
                    {formatPrice(property.price)}
                  </p>

                  <div className="flex gap-4 text-sm text-gray-500 mb-4">
                    <span>🛏 {property.bedrooms} Beds</span>
                    <span>🚿 {property.bathrooms} Baths</span>
                    <span>📐 {property.size} m²</span>
                  </div>

                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                    {property.description}
                  </p>

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onSelectProperty(property);
                        onNav("property-details");
                      }}
                      className="flex-1 px-4 py-2 border border-[#1e3a5f] text-[#1e3a5f] rounded-lg text-sm font-semibold hover:bg-[#e8f2fc] transition-all"
                    >
                      View Details
                    </button>

                    <button
                      onClick={() => {
                        onSelectProperty(property);
                        onNav("schedule-viewing");
                      }}
                      className="flex-1 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152b47] transition-all"
                    >
                      Schedule Viewing
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Ratings helpers ──────────────────────────────────────────────────────────
const RatingStars = ({ value, onChange, size = "text-2xl", readOnly = false }: {
  value: number;
  onChange?: (value: number) => void;
  size?: string;
  readOnly?: boolean;
}) => (
  <div className="flex items-center gap-1" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readOnly}
        onClick={() => onChange?.(star)}
        aria-label={`Rate ${star} out of 5`}
        className={`${size} leading-none ${star <= value ? "text-amber-400" : "text-gray-300"} ${readOnly ? "cursor-default" : "hover:scale-110 transition-transform"}`}
      >
        ★
      </button>
    ))}
  </div>
);

const ratingSummary = (items: Rating[]) => ({
  count: items.length,
  average: items.length ? items.reduce((sum, item) => sum + item.rating, 0) / items.length : 0,
});

const ReviewList = ({ reviews, emptyText = "No reviews yet." }: { reviews: Rating[]; emptyText?: string }) => (
  <div className="space-y-3">
    {reviews.length === 0 ? (
      <p className="text-sm text-gray-500">{emptyText}</p>
    ) : reviews.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((review) => (
      <div key={review.id} className="border border-gray-100 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <div>
            <p className="font-semibold text-gray-800 text-sm">{review.clientName}</p>
            <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
          </div>
          <RatingStars value={review.rating} readOnly size="text-lg" />
        </div>
        {review.comment ? <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p> : <p className="text-xs text-gray-400 italic">No written comment.</p>}
      </div>
    ))}
  </div>
);

// ─── Screen: Property Details ─────────────────────────────────────────────────

const PropertyDetailsScreen = ({
  onNav,
  property,
  clientName,
  isFavorite,
  onToggleFavorite,
  ratings,
}: {
  onNav: (p: Page) => void;
  property: Property | null;
  clientName: string;
  isFavorite: boolean;
  onToggleFavorite: (propertyId: number) => void;
  ratings: Rating[];
}) => {
  const [activeImage, setActiveImage] = useState("");

  if (!property) return null;

  const propertyImages = Array.from(
    new Set([property.image, ...(property.images || [])].filter(Boolean))
  );

  const propertyReviews = ratings.filter(
    (r) => r.targetType === "property" && r.targetId === property.id
  );

  const propertySummary = ratingSummary(propertyReviews);

  const selectedImage = propertyImages.includes(activeImage)
    ? activeImage
    : propertyImages[0] || "";

  return (
    <div className="bg-[#f4f6f9] min-h-screen">
      <ClientNav active="client-home" onNav={onNav} clientName={clientName} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => onNav("client-home")}
          className="flex items-center gap-2 text-[#3a8dde] hover:text-[#1e3a5f] text-sm font-semibold mb-5 transition-all"
        >
          ← Back to Listings
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* MAIN PROPERTY PHOTO */}
          <div className="h-72 md:h-96 bg-gray-100 relative">
            {selectedImage ? (
              <PropertyImage
                src={selectedImage}
                alt={property.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No property photo available
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

            <div className="absolute bottom-5 left-6 text-white pointer-events-none">
              <span className="bg-white/20 backdrop-blur-sm text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
                {property.type}
              </span>
            </div>

            <div className="absolute bottom-5 right-6 text-white text-xs bg-black/40 px-3 py-1 rounded-full">
              {propertyImages.length} Photos
            </div>
          </div>

          {/* PHOTO THUMBNAILS */}
          {propertyImages.length > 1 && (
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-[#1e3a5f] mb-3">
                Property Gallery
              </h3>

              <div className="flex gap-3 overflow-x-auto pb-2">
                {propertyImages.map((img, index) => (
                  <button
                    key={`${img}-${index}`}
                    onClick={() => setActiveImage(img)}
                    className={`shrink-0 w-24 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === img
                        ? "border-[#3a8dde] ring-2 ring-blue-100"
                        : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    <PropertyImage
                      src={img}
                      alt={`${property.name} photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-[#1e3a5f] font-serif-display mb-1">
                  {property.name}
                </h1>
                <p className="text-gray-500 flex items-center gap-1">
                  📍 {property.location}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-3xl font-bold text-[#3a8dde]">
                  {formatPrice(property.price)}
                </p>
                {statusBadge(property.status)}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { icon: "🛏", label: "Bedrooms", value: property.bedrooms },
                { icon: "🚿", label: "Bathrooms", value: property.bathrooms },
                { icon: "📐", label: "Property Size", value: `${property.size} m²` },
                { icon: "🏠", label: "Type", value: property.type },
              ].map((s) => (
                <div key={s.label} className="bg-[#f4f6f9] rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-xl font-bold text-[#1e3a5f]">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-bold text-[#1e3a5f] mb-3">
                About This Property
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {property.description}
              </p>
            </div>

            <section className="mb-8 border-t border-gray-100 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#1e3a5f]">
                    Property Ratings & Reviews
                  </h2>
                  <p className="text-sm text-gray-500">
                    Feedback from clients who completed a viewing.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-[#1e3a5f]">
                    {propertySummary.count ? propertySummary.average.toFixed(1) : "—"}
                  </span>
                  <div>
                    <RatingStars
                      value={Math.round(propertySummary.average)}
                      readOnly
                      size="text-lg"
                    />
                    <p className="text-xs text-gray-500">
                      {propertySummary.count} review(s)
                    </p>
                  </div>
                </div>
              </div>

              <ReviewList
                reviews={propertyReviews}
                emptyText="This property has not received any reviews yet."
              />
            </section>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => onNav("schedule-viewing")}
                className="px-8 py-3 bg-[#1e3a5f] hover:bg-[#152b47] text-white font-semibold rounded-lg transition-all text-sm shadow-sm"
              >
                Schedule a Viewing
              </button>

              <button
                onClick={() => onToggleFavorite(property.id)}
                aria-pressed={isFavorite}
                className={`px-8 py-3 border font-semibold rounded-lg transition-all text-sm ${
                  isFavorite
                    ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {isFavorite ? "♥ Saved to Favorites" : "♡ Save to Favorites"}
              </button>

              <button
                onClick={() => onNav("client-home")}
                className="px-8 py-3 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold rounded-lg transition-all text-sm"
              >
                Back to Listings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// ─── Screen: Schedule Viewing ─────────────────────────────────────────────────
const ScheduleViewingScreen = ({
  onNav,
  property,
  onSubmit,
  appointments,
  profile,
}: {
  onNav: (p: Page) => void;
  property: Property | null;
  onSubmit: (appt: Omit<Appointment, "id" | "clientId">) => Promise<void>;
  appointments: Appointment[];
  profile: ClientProfile;
}) => {
  const clientName = profile.name;
  const [form, setForm] = useState({
    clientName: profile.name,
    contact: profile.contact,
    date: "",
    time: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // A slot is taken if another active booking exists for the same property, date and time.
  const isTaken = (time: string) =>
    !!form.date &&
    appointments.some(
      (a) =>
        a.propertyId === property?.id &&
        a.date === form.date &&
        a.time === time &&
        (a.status === "Pending" || a.status === "Confirmed")
    );

  const timeSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"];

  const handleSubmit = async () => {
    if (!property) { setError("Please select a property first."); return; }
    if (!form.clientName.trim() || !form.contact.trim()) { setError("Please enter your name and contact number."); return; }
    if (!form.date || !form.time) { setError("Please choose a preferred date and time."); return; }
    if (form.date < todayLocal()) { setError("Please choose a date that is today or later."); return; }
    if (isTaken(form.time)) { setError("That time slot is already booked for this property. Please pick another."); return; }
    setError("");
    setSaving(true);
    try {
      await onSubmit({
        clientName: form.clientName,
        contactNumber: form.contact,
        propertyId: property.id,
        propertyName: property.name,
        date: form.date,
        time: form.time,
        status: "Pending",
        message: form.message,
      });
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit your appointment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#f4f6f9] min-h-screen">
      <ClientNav active="client-home" onNav={onNav} clientName={clientName} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => onNav("property-details")}
          className="flex items-center gap-2 text-[#3a8dde] text-sm font-semibold mb-5 hover:text-[#1e3a5f] transition-all"
        >
          ← Back to Property Details
        </button>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-[#1e3a5f] font-serif-display mb-1">Schedule a Viewing</h1>
          <p className="text-sm text-gray-500 mb-6">Fill out the form below to request a property viewing appointment.</p>

          {submitted ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h3 className="text-xl font-bold text-green-700 mb-2">Appointment Submitted!</h3>
              <p className="text-gray-500 mb-6">
                Your viewing appointment for <strong>{property?.name}</strong> has been successfully submitted. Our agent will confirm your schedule shortly.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => onNav("my-appointments")}
                  className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152b47] transition-all"
                >
                  View My Appointments
                </button>
                <button
                  onClick={() => onNav("client-home")}
                  className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all"
                >
                  Back to Home
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-5 p-4 bg-[#e8f2fc] rounded-xl border border-[#3a8dde]/20">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Selected Property</p>
                <p className="text-[#1e3a5f] font-bold">{property?.name ?? "—"}</p>
                <p className="text-gray-500 text-sm">{property?.location}</p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
              )}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client Name</label>
                    <input
                      type="text"
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Number</label>
                    <input
                      type="tel"
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preferred Date</label>
                  <input
                    type="date"
                    value={form.date}
                    min={todayLocal()}
                    onChange={(e) => { setForm({ ...form, date: e.target.value, time: "" }); setError(""); }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preferred Time</label>
                  <select
                    value={form.time}
                    onChange={(e) => { setForm({ ...form, time: e.target.value }); setError(""); }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all bg-white"
                  >
                    <option value="">Select a time slot</option>
                    {timeSlots.map((t) => (
                      <option key={t} value={t} disabled={isTaken(t)}>{t}{isTaken(t) ? " (booked)" : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Message <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={3}
                    placeholder="Any special requests or questions for the agent..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 bg-[#1e3a5f] hover:bg-[#152b47] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-all text-sm"
                >
                  {saving ? "Submitting..." : "Submit Appointment"}
                </button>
                <button
                  onClick={() => onNav("property-details")}
                  className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-lg transition-all text-sm"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Screen: My Appointments ──────────────────────────────────────────────────
const MyAppointmentsScreen = ({
  onNav,
  appointments,
  onSelectAppointment,
  clientName,
  clientId,
}: {
  onNav: (p: Page) => void;
  appointments: Appointment[];
  onSelectAppointment: (a: Appointment) => void;
  clientName: string;
  clientId: number;
}) => {
  const myAppts = appointments.filter((a) => a.clientId === clientId);
  const [filterStatus, setFilterStatus] = useState("All");
  const statuses = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];
  const filtered = filterStatus === "All" ? myAppts : myAppts.filter((a) => a.status === filterStatus);

  return (
    <div className="bg-[#f4f6f9] min-h-screen">
      <ClientNav active="my-appointments" onNav={onNav} clientName={clientName} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1e3a5f] font-serif-display">My Appointments</h1>
            <p className="text-gray-500 text-sm">Track and manage your property viewing appointments.</p>
          </div>
          <button
            onClick={() => onNav("client-home")}
            className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152b47] transition-all self-start sm:self-auto"
          >
            + Schedule Viewing
          </button>
        </div>
        <div className="flex gap-2 mb-5 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                filterStatus === s
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#3a8dde]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
            <div className="text-5xl mb-3">📅</div>
            <p className="text-gray-500">No appointments found.</p>
            <button onClick={() => onNav("client-home")} className="mt-4 text-[#3a8dde] text-sm font-semibold hover:underline">
              Browse Properties
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((appt) => (
              <div key={appt.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 bg-[#e8f2fc] rounded-xl flex items-center justify-center text-2xl shrink-0">
                  🏠
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1e3a5f] text-base">{appt.propertyName}</h3>
                  <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
                    <span>📅 {appt.date}</span>
                    <span>🕐 {appt.time}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {statusBadge(appt.status)}
                  <button
                    onClick={() => { onSelectAppointment(appt); onNav("appointment-details"); }}
                    className="px-4 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Screen: Appointment Details (Client) ────────────────────────────────────
const AppointmentDetailsScreen = ({
  onNav,
  appointment,
  clientName,
  currentUserId,
  ratings,
  onSubmitRatings,
}: {
  onNav: (p: Page) => void;
  appointment: Appointment | null;
  clientName: string;
  currentUserId: number;
  ratings: Rating[];
  onSubmitRatings: (items: Omit<Rating, "id" | "createdAt">[]) => Promise<boolean>;
}) => {
  const [propertyRating, setPropertyRating] = useState(0);
  const [agentRating, setAgentRating] = useState(0);
  const [propertyComment, setPropertyComment] = useState("");
  const [agentComment, setAgentComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (!appointment) return null;

  const existingPropertyReview = ratings.find((r) => r.appointmentId === appointment.id && r.clientId === currentUserId && r.targetType === "property");
  const existingAgentReview = ratings.find((r) => r.appointmentId === appointment.id && r.clientId === currentUserId && r.targetType === "agent");
  const agentReviews = appointment.assignedAgentId
    ? ratings.filter((r) => r.targetType === "agent" && r.targetId === appointment.assignedAgentId)
    : [];
  const agentSummary = ratingSummary(agentReviews);
  const canReview = appointment.status === "Completed";

  const submitReview = async () => {
    setError("");
    setNotice("");

    console.log("[VELORA] Submit Review clicked");

    const pending: Omit<Rating, "id" | "createdAt">[] = [];

    if (!existingPropertyReview) {
      if (propertyRating < 1 || propertyRating > 5) {
        setError("Please rate the property from 1 to 5 stars.");
        return;
      }
      if (!propertyComment.trim()) {
        setError("Please write a short comment about the property.");
        return;
      }
      pending.push({
        appointmentId: appointment.id,
        clientId: currentUserId,
        clientName,
        targetType: "property",
        targetId: appointment.propertyId,
        targetName: appointment.propertyName,
        rating: propertyRating,
        comment: propertyComment.trim(),
      });
    }

    if (!existingAgentReview) {
      if (!appointment.assignedAgentId || !appointment.assignedAgentName) {
        setError("An agent must be assigned to this appointment before you can rate the agent.");
        return;
      }
      if (agentRating < 1 || agentRating > 5) {
        setError("Please rate the assigned agent from 1 to 5 stars.");
        return;
      }
      if (!agentComment.trim()) {
        setError("Please write a short comment about the agent.");
        return;
      }
      pending.push({
        appointmentId: appointment.id,
        clientId: currentUserId,
        clientName,
        targetType: "agent",
        targetId: appointment.assignedAgentId,
        targetName: appointment.assignedAgentName,
        rating: agentRating,
        comment: agentComment.trim(),
      });
    }

    if (!pending.length) {
      setNotice("You have already submitted both reviews for this viewing.");
      return;
    }

    console.log("[VELORA] Ratings ready to submit:", pending);
    setSaving(true);

    try {
      const shared = await onSubmitRatings(pending);
      if (!shared) {
        throw new Error("Ratings were not saved to the database.");
      }
      setNotice("Thank you! Your property and agent reviews have been submitted.");
      setPropertyRating(0);
      setAgentRating(0);
      setPropertyComment("");
      setAgentComment("");
    } catch (error) {
      console.error("[VELORA] Review submission failed:", error);
      setError(error instanceof Error ? error.message : "Could not submit your reviews. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#f4f6f9] min-h-screen">
      <ClientNav active="my-appointments" onNav={onNav} clientName={clientName} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => onNav("my-appointments")} className="flex items-center gap-2 text-[#3a8dde] text-sm font-semibold mb-5 hover:text-[#1e3a5f] transition-all">← Back to Appointments</button>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-start justify-between mb-6 gap-3">
            <h1 className="text-2xl font-bold text-[#1e3a5f] font-serif-display">Appointment Details</h1>
            {statusBadge(appointment.status)}
          </div>
          <div className="space-y-4">
            {[
              { label: "Property", value: appointment.propertyName },
              { label: "Client Name", value: appointment.clientName },
              { label: "Contact Number", value: appointment.contactNumber },
              { label: "Viewing Date", value: appointment.date },
              { label: "Viewing Time", value: appointment.time },
              { label: "Assigned Agent", value: appointment.assignedAgentName || "Not yet assigned" },
              { label: "Status", value: appointment.status },
              { label: "Message", value: appointment.message || "—" },
            ].map((row) => (
              <div key={row.label} className="flex flex-col sm:flex-row gap-1 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-500 sm:w-40 shrink-0">{row.label}</span>
                <span className="text-sm text-gray-800">{row.value}</span>
              </div>
            ))}
          </div>

          {canReview && (
            <section className="mt-8 border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-[#1e3a5f] mb-1">Rate Your Viewing Experience</h2>
              <p className="text-sm text-gray-500 mb-5">Share your feedback about the property and the agent who assisted you.</p>
              {notice && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}
              {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
              <div className="space-y-5">
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div><h3 className="font-semibold text-gray-800">Property: {appointment.propertyName}</h3><p className="text-xs text-gray-500">Rate the property itself.</p></div>
                    {existingPropertyReview && <span className="text-xs font-semibold text-green-700">Reviewed</span>}
                  </div>
                  {existingPropertyReview ? <><RatingStars value={existingPropertyReview.rating} readOnly /><p className="mt-2 text-sm text-gray-600">{existingPropertyReview.comment || "No written comment."}</p></> : <><RatingStars value={propertyRating} onChange={setPropertyRating} /><textarea value={propertyComment} onChange={(e) => setPropertyComment(e.target.value)} rows={3} maxLength={1000} placeholder="Write your property feedback..." className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3a8dde] focus:outline-none" /></>}
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div><h3 className="font-semibold text-gray-800">Agent: {appointment.assignedAgentName || "Not assigned"}</h3><p className="text-xs text-gray-500">Rate the agent who assisted you.</p></div>
                    {existingAgentReview && <span className="text-xs font-semibold text-green-700">Reviewed</span>}
                  </div>
                  {existingAgentReview ? <><RatingStars value={existingAgentReview.rating} readOnly /><p className="mt-2 text-sm text-gray-600">{existingAgentReview.comment || "No written comment."}</p></> : appointment.assignedAgentId ? <><RatingStars value={agentRating} onChange={setAgentRating} /><textarea value={agentComment} onChange={(e) => setAgentComment(e.target.value)} rows={3} maxLength={1000} placeholder="Write your feedback about the agent..." className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3a8dde] focus:outline-none" /></> : <p className="text-sm text-amber-700">The admin must assign an agent before you can submit an agent rating.</p>}
                  {appointment.assignedAgentId && <div className="mt-3 flex items-center gap-2 text-xs text-gray-500"><RatingStars value={Math.round(agentSummary.average)} readOnly size="text-sm" /> {agentSummary.count} agent review(s)</div>}
                  {appointment.assignedAgentId && agentReviews.length > 0 && <div className="mt-4 border-t border-gray-100 pt-3"><p className="text-xs font-semibold text-gray-600 mb-2">Other client feedback for this agent</p><ReviewList reviews={agentReviews} /></div>}
                </div>
              </div>
              {(!existingPropertyReview || !existingAgentReview) && (
                <button onClick={submitReview} disabled={saving} className="mt-5 w-full rounded-lg bg-[#1e3a5f] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#152b47] disabled:opacity-60">{saving ? "Submitting..." : "Submit Ratings & Reviews"}</button>
              )}
            </section>
          )}
          {!canReview && <p className="mt-6 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">You can submit ratings and reviews after your appointment is marked as Completed.</p>}
          <button onClick={() => onNav("my-appointments")} className="mt-6 px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all">Back</button>
        </div>
      </div>
    </div>
  );
};

// ─── Screen: Client Profile ───────────────────────────────────────────────────
const ClientProfileScreen = ({
  onNav,
  savedProfile,
  onSaveProfile,
}: {
  onNav: (p: Page) => void;
  savedProfile: ClientProfile;
  onSaveProfile: (p: ClientProfile) => Promise<void>;
}) => {
  const clientName = savedProfile.name;
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<ClientProfile>(savedProfile);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    if (!saved && !pwSaved) return;
    const t = setTimeout(() => { setSaved(false); setPwSaved(false); }, 2500);
    return () => clearTimeout(t);
  }, [saved, pwSaved]);

  const handleSave = async () => {
    if (!profile.name.trim() || !profile.contact.trim()) { setProfileError("Name and contact number are required."); return; }
    if (!isValidEmail(profile.email.trim())) { setProfileError("Please enter a valid email address."); return; }
    setProfileError("");
    const cleaned = { name: profile.name.trim(), email: profile.email.trim(), contact: profile.contact.trim() };
    try {
      await onSaveProfile(cleaned);
      setProfile(cleaned);
      setSaved(true);
      setEditing(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not update your profile.");
    }
  };

  const handleCancel = () => { setProfile(savedProfile); setProfileError(""); setEditing(false); };

  const resetPasswordForm = () => { setPw({ current: "", next: "", confirm: "" }); setPwError(""); setChangingPassword(false); };

  const handleUpdatePassword = () => {
    if (!pw.current || !pw.next || !pw.confirm) { setPwError("Please fill in all password fields."); return; }
    if (pw.next.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (pw.next !== pw.confirm) { setPwError("New passwords do not match."); return; }
    resetPasswordForm();
    setPwSaved(true);
  };

  return (
    <div className="bg-[#f4f6f9] min-h-screen">
      <ClientNav active="client-profile" onNav={onNav} clientName={clientName} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1e3a5f] font-serif-display mb-6">My Profile</h1>
        {saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg font-medium">
            Profile updated successfully!
          </div>
        )}
        {pwSaved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg font-medium">
            Password updated successfully!
          </div>
        )}
        {profileError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{profileError}</div>
        )}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-2xl font-bold">
              {(savedProfile.name.trim()[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1e3a5f]">{savedProfile.name}</h2>
              <p className="text-gray-500 text-sm">Client Account</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: "Full Name", key: "name", type: "text" },
              { label: "Email Address", key: "email", type: "email" },
              { label: "Contact Number", key: "contact", type: "tel" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={profile[f.key as keyof typeof profile]}
                  onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
                  disabled={!editing}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-all ${
                    editing
                      ? "border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            {editing ? (
              <>
                <button onClick={handleSave} className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152b47] transition-all">
                  Save Changes
                </button>
                <button onClick={handleCancel} className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152b47] transition-all">
                Edit Profile
              </button>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-lg font-bold text-[#1e3a5f] mb-4">Change Password</h3>
          {changingPassword ? (
            <div className="space-y-4">
              {pwError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{pwError}</div>
              )}
              {([
                { label: "Current Password", key: "current" },
                { label: "New Password", key: "next" },
                { label: "Confirm New Password", key: "confirm" },
              ] as const).map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label>
                  <input type="password" placeholder="••••••••" value={pw[f.key]} onChange={(e) => { setPw({ ...pw, [f.key]: e.target.value }); setPwError(""); }} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all" />
                </div>
              ))}
              <div className="flex gap-3 mt-2">
                <button onClick={handleUpdatePassword} className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152b47] transition-all">
                  Update Password
                </button>
                <button onClick={resetPasswordForm} className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setChangingPassword(true)} className="px-6 py-2.5 border border-[#1e3a5f] text-[#1e3a5f] rounded-lg text-sm font-semibold hover:bg-[#e8f2fc] transition-all">
              Change Password
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Screen: Favorites (saved properties) ─────────────────────────────────────
const FavoritesScreen = ({
  onNav,
  properties,
  favorites,
  onToggleFavorite,
  onSelectProperty,
  clientName,
}: {
  onNav: (p: Page) => void;
  properties: Property[];
  favorites: Favorite[];
  onToggleFavorite: (propertyId: number) => void;
  onSelectProperty: (p: Property) => void;
  clientName: string;
}) => {
  // Newest saved first. A saved property that no longer exists is skipped.
  const saved = [...favorites]
    .sort((a, b) => (a.dateSaved < b.dateSaved ? 1 : a.dateSaved > b.dateSaved ? -1 : b.id - a.id))
    .map((f) => ({ fav: f, property: properties.find((p) => p.id === f.propertyId) }))
    .filter((x): x is { fav: Favorite; property: Property } => !!x.property);

  return (
    <div className="bg-[#f4f6f9] min-h-screen">
      <ClientNav active="favorites" onNav={onNav} clientName={clientName} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e3a5f] font-serif-display">Saved Properties</h1>
          <p className="text-gray-500 text-sm">
            {saved.length === 0
              ? "Properties you save with the heart button will show up here."
              : `${saved.length} saved ${saved.length === 1 ? "property" : "properties"}`}
          </p>
        </div>
        {saved.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
            <div className="text-5xl mb-3 text-gray-300">♡</div>
            <p className="text-gray-500">You haven&apos;t saved any properties yet.</p>
            <button onClick={() => onNav("client-home")} className="mt-4 text-[#3a8dde] text-sm font-semibold hover:underline">
              Browse Properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {saved.map(({ fav, property }) => (
              <div key={fav.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  <PropertyImage
                    src={property.image}
                    alt={property.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/90 text-[#1e3a5f] text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                      {property.type}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <HeartButton saved onToggle={() => onToggleFavorite(property.id)} />
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-[#1e3a5f] text-lg">{property.name}</h3>
                    {property.status !== "Available" && statusBadge(property.status)}
                  </div>
                  <p className="text-gray-500 text-sm mb-2">📍 {property.location}</p>
                  <p className="text-[#3a8dde] font-bold text-xl mb-2">{formatPrice(property.price)}</p>
                  <div className="flex gap-4 text-sm text-gray-500 mb-1">
                    <span>🛏 {property.bedrooms}</span>
                    <span>🚿 {property.bathrooms}</span>
                    <span>📐 {property.size} m²</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">Saved on {fav.dateSaved}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onSelectProperty(property); onNav("property-details"); }}
                      className="flex-1 px-4 py-2 border border-[#1e3a5f] text-[#1e3a5f] rounded-lg text-sm font-semibold hover:bg-[#e8f2fc] transition-all"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => { onSelectProperty(property); onNav("schedule-viewing"); }}
                      disabled={property.status !== "Available"}
                      className="flex-1 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152b47] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Schedule Viewing
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Screen: Admin Dashboard ──────────────────────────────────────────────────

const AdminDashboardScreen = ({
  onNav,
  properties,
  appointments,
}: {
  onNav: (p: Page) => void;
  properties: Property[];
  appointments: Appointment[];
}) => {
  const stats = [
    {
      label: "Total Properties",
      value: properties.length,
      icon: "🏠",
      color: "bg-[#1e3a5f]",
      sub: "All listings",
    },
    {
      label: "Available Properties",
      value: properties.filter((p) => p.status === "Available").length,
      icon: "✅",
      color: "bg-emerald-600",
      sub: "Currently active",
    },
    {
      label: "Total Appointments",
      value: appointments.length,
      icon: "📅",
      color: "bg-[#3a8dde]",
      sub: "All time",
    },
    {
      label: "Pending Appointments",
      value: appointments.filter((a) => a.status === "Pending").length,
      icon: "⏳",
      color: "bg-amber-500",
      sub: "Awaiting confirmation",
    },
  ];

  const recent = appointments.slice(-5).reverse();

  // DATE PARSER
  const parseAppointmentDate = (dateValue: string): Date | null => {
    if (!dateValue) return null;

    const parsed = new Date(dateValue);

    if (!Number.isNaN(parsed.getTime())) return parsed;

    return null;
  };

  // 1. MONTHLY APPOINTMENTS - LAST 6 MONTHS
  const monthlyData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (5 - index));

    const count = appointments.filter((a) => {
      const appointmentDate = parseAppointmentDate(a.date);

      return (
        appointmentDate &&
        appointmentDate.getMonth() === date.getMonth() &&
        appointmentDate.getFullYear() === date.getFullYear()
      );
    }).length;

    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      count,
    };
  });

  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);

  // 2. MOST POPULAR PROPERTIES
  const propertyCounts = appointments.reduce((acc, appointment) => {
    const name = appointment.propertyName || "Unknown Property";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const popularProperties = Object.entries(propertyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxProperty = Math.max(
    ...popularProperties.map((p) => p[1]),
    1
  );

  // 3. PENDING VS CONFIRMED
  const pendingCount = appointments.filter(
    (a) => a.status === "Pending"
  ).length;

  const confirmedCount = appointments.filter(
    (a) => a.status === "Confirmed"
  ).length;

  const totalPendingConfirmed = pendingCount + confirmedCount;

  const pendingPercentage = totalPendingConfirmed
    ? Math.round((pendingCount / totalPendingConfirmed) * 100)
    : 0;

  const confirmedPercentage = totalPendingConfirmed
    ? Math.round((confirmedCount / totalPendingConfirmed) * 100)
    : 0;

  return (
    <AdminLayout active="admin-dashboard" onNav={onNav}>
      {/* DASHBOARD HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e3a5f] font-serif-display">
          Dashboard Overview
        </h1>
        <p className="text-gray-500 text-sm">
          Welcome back. Here's what's happening today.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
          >
            <div
              className={`w-10 h-10 ${s.color} rounded-lg flex items-center justify-center text-xl mb-3`}
            >
              {s.icon}
            </div>

            <div className="text-3xl font-bold text-[#1e3a5f] mb-0.5">
              {s.value}
            </div>

            <div className="text-sm font-semibold text-gray-700">
              {s.label}
            </div>

            <div className="text-xs text-gray-400 mt-0.5">
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* DASHBOARD ANALYTICS */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[#1e3a5f]">
            Dashboard Analytics
          </h2>
          <p className="text-sm text-gray-500">
            Visual overview of Velora appointment activities.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* CHART 1: MONTHLY APPOINTMENTS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6">
              <h3 className="font-bold text-[#1e3a5f]">
                Monthly Appointments
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Appointment bookings over the last 6 months
              </p>
            </div>

            <div className="flex items-end justify-between gap-3 h-48">
              {monthlyData.map((m) => (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center justify-end h-full gap-2"
                >
                  <span className="text-xs font-semibold text-gray-600">
                    {m.count}
                  </span>

                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full bg-[#3a8dde] hover:bg-[#1e3a5f] rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(
                          (m.count / maxMonthly) * 100,
                          m.count > 0 ? 5 : 0
                        )}%`,
                        minHeight: m.count > 0 ? "8px" : "0px",
                      }}
                    />
                  </div>

                  <span className="text-xs text-gray-500">
                    {m.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CHART 2: MOST POPULAR PROPERTIES */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6">
              <h3 className="font-bold text-[#1e3a5f]">
                Most Popular Properties
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Top 5 properties based on appointment bookings
              </p>
            </div>

            {popularProperties.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-gray-400">
                No property bookings available yet.
              </div>
            ) : (
              <div className="space-y-5">
                {popularProperties.map(([name, count], index) => (
                  <div key={name}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        <span className="text-[#3a8dde] font-bold mr-2">
                          #{index + 1}
                        </span>
                        {name}
                      </span>

                      <span className="text-sm font-bold text-[#1e3a5f]">
                        {count}
                      </span>
                    </div>

                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3a8dde] rounded-full transition-all"
                        style={{
                          width: `${(count / maxProperty) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CHART 3: PENDING VS CONFIRMED */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <div className="mb-6">
              <h3 className="font-bold text-[#1e3a5f]">
                Pending vs. Confirmed Appointments
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Comparison of appointments awaiting confirmation and confirmed bookings
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">

              {/* PENDING */}
              <div className="border border-amber-100 bg-amber-50 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-amber-700">
                    Pending
                  </span>
                  <span className="text-2xl">⏳</span>
                </div>

                <div className="text-3xl font-bold text-amber-700 mt-3">
                  {pendingCount}
                </div>

                <p className="text-xs text-amber-600 mt-1">
                  {pendingPercentage}% of pending and confirmed
                </p>
              </div>

              {/* CONFIRMED */}
              <div className="border border-blue-100 bg-blue-50 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-blue-700">
                    Confirmed
                  </span>
                  <span className="text-2xl">✅</span>
                </div>

                <div className="text-3xl font-bold text-blue-700 mt-3">
                  {confirmedCount}
                </div>

                <p className="text-xs text-blue-600 mt-1">
                  {confirmedPercentage}% of pending and confirmed
                </p>
              </div>
            </div>

            {/* COMPARISON BAR */}
            <div className="flex h-5 rounded-full overflow-hidden bg-gray-100">
              <div
                className="bg-amber-400 transition-all"
                style={{
                  width: `${pendingPercentage}%`,
                }}
              />

              <div
                className="bg-blue-500 transition-all"
                style={{
                  width: `${confirmedPercentage}%`,
                }}
              />
            </div>

            <div className="flex flex-wrap justify-between gap-3 mt-4 text-xs text-gray-500">
              <span>
                <span className="inline-block w-2.5 h-2.5 bg-amber-400 rounded-full mr-2" />
                Pending: {pendingCount}
              </span>

              <span>
                <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-full mr-2" />
                Confirmed: {confirmedCount}
              </span>

              <span className="font-semibold text-gray-700">
                Total: {totalPendingConfirmed}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT APPOINTMENTS AND STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* RECENT APPOINTMENTS */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-[#1e3a5f]">
              Recent Appointments
            </h2>

            <button
              onClick={() => onNav("admin-appointments")}
              className="text-sm text-[#3a8dde] font-semibold hover:underline"
            >
              View All →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Client
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Property
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {recent.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3 font-medium text-gray-800">
                      {a.clientName}
                    </td>

                    <td className="px-6 py-3 text-gray-600">
                      {a.propertyName}
                    </td>

                    <td className="px-6 py-3 text-gray-500">
                      {a.date}
                    </td>

                    <td className="px-6 py-3">
                      {statusBadge(a.status)}
                    </td>
                  </tr>
                ))}

                {recent.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-8 text-gray-400"
                    >
                      No recent appointments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* APPOINTMENT STATUS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-[#1e3a5f] mb-4">
            Appointment Status
          </h2>

          {["Pending", "Confirmed", "Completed", "Cancelled"].map((s) => {
            const count = appointments.filter(
              (a) => a.status === s
            ).length;

            const pct = appointments.length
              ? Math.round((count / appointments.length) * 100)
              : 0;

            const colors: Record<string, string> = {
              Pending: "bg-amber-400",
              Confirmed: "bg-blue-400",
              Completed: "bg-green-400",
              Cancelled: "bg-red-400",
            };

            return (
              <div key={s} className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">
                    {s}
                  </span>

                  <span className="text-gray-500">
                    {count} ({pct}%)
                  </span>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors[s]} rounded-full`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          <button
            onClick={() => onNav("admin-reports")}
            className="w-full mt-4 py-2.5 border border-[#1e3a5f] text-[#1e3a5f] rounded-lg text-sm font-semibold hover:bg-[#e8f2fc] transition-all"
          >
            Generate Full Report
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};


// ─── Screen: Admin Property Management ───────────────────────────────────────
const AdminPropertiesScreen = ({
  onNav,
  properties,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  setEditingProperty,
  editingProperty,
  propertiesLoading,
  propertiesError,
}: {
  onNav: (p: Page) => void;
  properties: Property[];
  onAddProperty: (p: Omit<Property, "id">) => Promise<void>;
  onUpdateProperty: (p: Property) => Promise<void>;
  onDeleteProperty: (id: number) => Promise<void>;
  setEditingProperty: (p: Property | null) => void;
  editingProperty: Property | null;
  propertiesLoading: boolean;
  propertiesError: string;
}) => {
  const [search, setSearch] = useState("");
const [showForm, setShowForm] = useState(false);
const [formError, setFormError] = useState("");
const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
const [saving, setSaving] = useState(false);

const [form, setForm] = useState<Omit<Property, "id">>({
  name: "", type: "House & Lot", location: "", price: 0,
  bedrooms: 3, bathrooms: 2, size: 100, description: "", image: "", status: "Available",
});

  const filtered = properties.filter(
    (p) => search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
  if (!form.name.trim() || !form.location.trim()) {
    setFormError("Property name and location are required.");
    return;
  }

  if (!(form.price > 0)) {
    setFormError("Please enter a price greater than 0.");
    return;
  }

  if (form.bedrooms < 0 || form.bathrooms < 0 || !(form.size > 0)) {
    setFormError("Bedrooms, bathrooms and size must be valid numbers.");
    return;
  }

  setFormError("");
  setSaving(true);
  try {
    // Upload selected files first, then save their server URLs with the property.
    let uploadedImageUrls: string[] = [];
    if (selectedImageFiles.length > 0) {
      const uploadData = new FormData();
      selectedImageFiles.forEach((file) => uploadData.append("images", file));

      const uploadResponse = await fetch(`${API_URL}/api/v1/uploads`, {
        method: "POST",
        body: uploadData,
      });
      const uploadResult = await uploadResponse.json().catch(() => null);
      if (!uploadResponse.ok || !uploadResult?.success || !Array.isArray(uploadResult.images)) {
        throw new Error(uploadResult?.message || "Could not upload property images.");
      }
      uploadedImageUrls = uploadResult.images.map((item: { url: string }) => `${API_URL}${item.url}`);
    }

    const existingImages = form.images?.length ? form.images : form.image ? [form.image] : [];
    // When editing, uploading new images replaces the property's current image set.
    // If no new image is selected, keep the existing images unchanged.
    const images = editingProperty
      ? (uploadedImageUrls.length > 0 ? uploadedImageUrls : existingImages)
      : [...existingImages, ...uploadedImageUrls];
    const updatedForm = {
      ...form,
      image: images[0] || "",
      images,
      name: form.name.trim(),
      location: form.location.trim(),
    };

    if (editingProperty) {
      await onUpdateProperty({ ...editingProperty, ...updatedForm });
      setEditingProperty(null);
    } else {
      await onAddProperty(updatedForm);
    }

    setShowForm(false);
    setFormError("");
  } catch (error) {
    setFormError(error instanceof Error ? error.message : "Could not save property. Please try again.");
    return;
  } finally {
    setSaving(false);
  }

  setShowForm(false);
  setSelectedImageFiles([]);

  setForm({
    name: "",
    type: "House & Lot",
    location: "",
    price: 0,
    bedrooms: 3,
    bathrooms: 2,
    size: 100,
    description: "",
    image: "",
    images: [],
    status: "Available",
  });
};
  
const openEdit = (p: Property) => {
  setEditingProperty(p);
  setFormError("");

  window.scrollTo({ top: 0, behavior: "smooth" });

  setForm({
    name: p.name,
    type: p.type,
    location: p.location,
    price: p.price,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    size: p.size,
    description: p.description,
    image: p.image,
    images: p.images || [p.image],
    status: p.status,
  });

  setSelectedImageFiles([]);
  setShowForm(true);
};
return (
  <div className="p-6 space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold">Property Management</h1>
        <p className="text-gray-500">Manage your listed properties.</p>
      </div>

      <button
        onClick={() => {
          setEditingProperty(null);
          setFormError("");
          setSelectedImageFiles([]);
          setForm({
            name: "",
            type: "House & Lot",
            location: "",
            price: 0,
            bedrooms: 3,
            bathrooms: 2,
            size: 100,
            description: "",
            image: "",
            images: [],
            status: "Available",
          });
          setShowForm(!showForm);
        }}
        className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg"
      >
        {showForm ? "Close Form" : "+ Add Property"}
      </button>
    </div>

    {showForm && (
      <div className="bg-white border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-bold">
          {editingProperty ? "Edit Property" : "Add New Property"}
        </h2>

        {formError && (
          <p className="text-red-500 text-sm">{formError}</p>
        )}

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Property Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Property Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        />

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Location"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />

        <input
          type="number"
          className="w-full border rounded-lg p-3"
          placeholder="Price"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
        />

        <div className="grid grid-cols-3 gap-3">
          <input
            type="number"
            className="border rounded-lg p-3 w-full"
            placeholder="Bedrooms"
            value={form.bedrooms}
            onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })}
          />

          <input
            type="number"
            className="border rounded-lg p-3 w-full"
            placeholder="Bathrooms"
            value={form.bathrooms}
            onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })}
          />

          <input
            type="number"
            className="border rounded-lg p-3 w-full"
            placeholder="Size (sqm)"
            value={form.size}
            onChange={(e) => setForm({ ...form, size: Number(e.target.value) })}
          />
        </div>

        <textarea
          className="w-full border rounded-lg p-3"
          placeholder="Property Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Property Images</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 20) {
                setFormError("You can upload up to 20 images at a time.");
                e.target.value = "";
                return;
              }
              const invalid = files.find((file) => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 10 * 1024 * 1024);
              if (invalid) {
                setFormError("Use JPG, PNG, WEBP, or GIF images. Each image must be 10 MB or smaller.");
                e.target.value = "";
                return;
              }
              setFormError("");
              setSelectedImageFiles(files);
            }}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm"
          />
          <p className="text-xs text-gray-500">
            {editingProperty
              ? "Select new images to replace the current property images. Leave empty to keep the existing images. JPG, PNG, WEBP, or GIF; maximum 10 MB each."
              : "Choose up to 20 images. JPG, PNG, WEBP, or GIF; maximum 10 MB each."}
          </p>
          {(form.images?.length || selectedImageFiles.length > 0) ? (
            <div className="flex flex-wrap gap-3">
              {(!editingProperty || selectedImageFiles.length === 0) && (form.images ?? []).map((url, index) => (
                <img key={`saved-${index}`} src={url} alt={`Current property image ${index + 1}`} className="w-24 h-20 object-cover rounded-lg border" />
              ))}
              {selectedImageFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="text-xs text-gray-600 w-24">
                  <span className="block truncate">{file.name}</span>
                  <span className="text-green-700">Ready to upload</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <select
          className="w-full border rounded-lg p-3"
          value={form.status}
          onChange={(e) =>
            setForm({
              ...form,
              status: e.target.value as Property["status"],
            })
          }
        >
          <option value="Available">Available</option>
          <option value="Sold">Sold</option>
          <option value="Inactive">Inactive</option>
        </select>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg disabled:opacity-60"
        >
          {saving ? "Saving..." : editingProperty ? "Update Property" : "Save Property"}
        </button>
      </div>
    )}

    {propertiesLoading && (
      <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">Loading properties from MySQL...</p>
    )}
    {propertiesError && (
      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{propertiesError}</p>
    )}

    <input
      className="w-full border rounded-lg p-3"
      placeholder="Search properties..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {filtered.map((property) => (
        <div key={property.id} className="bg-white border rounded-xl overflow-hidden">
          <img
            src={property.image || "https://placehold.co/600x400"}
            alt={property.name}
            className="w-full h-48 object-cover"
          />

          <div className="p-4 space-y-2">
            <h3 className="font-bold text-lg">{property.name}</h3>
            <p className="text-gray-500">{property.location}</p>
            <p className="font-semibold">
              ₱{property.price.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">
              {property.bedrooms} Bedrooms · {property.bathrooms} Bathrooms · {property.size} sqm
            </p>
            <p className="text-sm">
              {property.status === "Inactive" ? "Archived" : property.status}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openEdit(property)}
                className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg"
              >
                Edit Property
              </button>
              {property.status === "Inactive" ? (
                <button
                  onClick={async () => {
                    const confirmed = window.confirm(`Restore ${property.name} to active listings?`);
                    if (!confirmed) return;
                    try {
                      await onUpdateProperty({ ...property, status: "Available" });
                    } catch (error) {
                      setFormError(error instanceof Error ? error.message : "Could not restore property.");
                    }
                  }}
                  className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg"
                >
                  Restore
                </button>
              ) : (
                <button
                  onClick={async () => {
                    const confirmed = window.confirm(`Archive ${property.name}? It will be hidden from active listings, but appointment history will be preserved.`);
                    if (!confirmed) return;
                    try {
                      await onDeleteProperty(property.id);
                    } catch (error) {
                      setFormError(error instanceof Error ? error.message : "Could not archive property.");
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                >
                  Archive
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
};

// ─── Screen: Admin Appointments ───────────────────────────────────────────────

const AdminAppointmentsScreen = ({
  onNav,
  appointments,
  onUpdateAppointment,
  agents,
  isAgent = false,
  userName = "Admin User",
}: {
  onNav: (p: Page) => void;
  appointments: Appointment[];
  onUpdateAppointment: (a: Appointment) => void;
  agents: User[];
  isAgent?: boolean;
  userName?: string;
}) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const statuses = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];

  const filtered = appointments
    .filter((a) => filterStatus === "All" || a.status === filterStatus)
    .filter(
      (a) =>
        search === "" ||
        a.clientName.toLowerCase().includes(search.toLowerCase()) ||
        a.propertyName.toLowerCase().includes(search.toLowerCase())
    );

  // EXPORT CSV
  const exportCSV = () => {
    const headers = [
      "Appointment ID",
      "Client Name",
      "Contact Number",
      "Property",
      "Date",
      "Time",
      "Assigned Agent",
      "Status",
    ];

    const escapeCSV = (value: unknown) => {
      let text = String(value ?? "");
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = filtered.map((a) => [
      a.id,
      a.clientName,
      a.contactNumber,
      a.propertyName,
      a.date,
      a.time,
      a.assignedAgentName || "Not Assigned",
      a.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "Velora_Appointments.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // EXPORT PDF
  const exportPDF = () => {
    if (filtered.length === 0) {
      alert("No appointments available to export.");
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Please allow pop-ups to export the PDF.");
      return;
    }

    const escapeHTML = (value: unknown) =>
      String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] || char);

    const rows = filtered
      .map(
        (a) => `
          <tr>
            <td>${escapeHTML(a.id)}</td>
            <td>${escapeHTML(a.clientName)}</td>
            <td>${escapeHTML(a.contactNumber)}</td>
            <td>${escapeHTML(a.propertyName)}</td>
            <td>${escapeHTML(a.date)}</td>
            <td>${escapeHTML(a.time)}</td>
            <td>${escapeHTML(a.assignedAgentName || "Not Assigned")}</td>
            <td>${escapeHTML(a.status)}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Velora Appointments Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 25px;
              color: #333;
            }

            h1 {
              color: #1e3a5f;
              margin-bottom: 5px;
            }

            p {
              color: #666;
              font-size: 13px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 11px;
            }

            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }

            th {
              background: #1e3a5f;
              color: white;
            }

            tr:nth-child(even) {
              background: #f2f5f9;
            }

            @media print {
              body {
                padding: 0;
              }

              table {
                font-size: 9px;
              }

              tr {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>

        <body>
          <h1>VELORA</h1>
          <h2>Appointments Report</h2>

          <p>Total Appointments: ${filtered.length}</p>
          <p>Status Filter: ${escapeHTML(filterStatus)}</p>
          <p>Date Generated: ${new Date().toLocaleDateString()}</p>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Contact</th>
                <th>Property</th>
                <th>Date</th>
                <th>Time</th>
                <th>Agent</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <AdminLayout active="admin-appointments" onNav={onNav} userName={userName} isAgent={isAgent}>
      {/* HEADER AND EXPORT BUTTONS */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] font-serif-display">
            Appointment Management
          </h1>
          <p className="text-gray-500 text-sm">
            {appointments.length} total appointments
          </p>
        </div>

        {!isAgent && <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-all"
          >
            📊 Export CSV
          </button>

          <button
            onClick={exportPDF}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all"
          >
            📄 Export PDF
          </button>
        </div>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* SEARCH AND FILTER */}
        <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client or property..."
            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all"
          />

          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filterStatus === s
                    ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#3a8dde]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* APPOINTMENT TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  "Client Name",
                  "Property",
                  "Date",
                  "Time",
                  "Assigned Agent",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-gray-400"
                  >
                    No appointments found.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">
                        {a.clientName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {a.contactNumber}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {a.propertyName}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {a.date}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {a.time}
                    </td>

                    <td className="px-6 py-4">
                      {isAgent ? (
                        <span className="text-gray-700">{a.assignedAgentName || userName}</span>
                      ) : (
                        <select
                          value={a.assignedAgentId ?? ""}
                          onChange={(e) => {
                            const selected = agents.find((agent) => agent.id === Number(e.target.value));
                            onUpdateAppointment({ ...a, assignedAgentId: selected?.id, assignedAgentName: selected?.name });
                          }}
                          className="min-w-36 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white"
                        >
                          <option value="">Assign agent</option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {statusBadge(a.status)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 flex-wrap">

                        {a.status === "Pending" && (
                          <button
                            onClick={() =>
                              onUpdateAppointment({
                                ...a,
                                status: "Confirmed",
                              })
                            }
                            className="px-2.5 py-1 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-all"
                          >
                            Confirm
                          </button>
                        )}

                        {a.status === "Confirmed" && (
                          <button
                            onClick={() =>
                              onUpdateAppointment({
                                ...a,
                                status: "Completed",
                              })
                            }
                            className="px-2.5 py-1 text-xs font-semibold bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-all"
                          >
                            Complete
                          </button>
                        )}

                        {(a.status === "Pending" ||
                          a.status === "Confirmed") && (
                          <button
                            onClick={() =>
                              onUpdateAppointment({
                                ...a,
                                status: "Cancelled",
                              })
                            }
                            className="px-2.5 py-1 text-xs font-semibold bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                          >
                            Cancel
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

// ─── Screen: Reports ──────────────────────────────────────────────────────────
const AdminReportsScreen = ({
  onNav,
  appointments,
}: {
  onNav: (p: Page) => void;
  appointments: Appointment[];
}) => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [generated, setGenerated] = useState(false);

  const filtered = appointments
    .filter((a) => filterStatus === "All" || a.status === filterStatus)
    .filter((a) => !dateFrom || a.date >= dateFrom)
    .filter((a) => !dateTo || a.date <= dateTo);

  const counts = {
    total: filtered.length,
    pending: filtered.filter((a) => a.status === "Pending").length,
    confirmed: filtered.filter((a) => a.status === "Confirmed").length,
    completed: filtered.filter((a) => a.status === "Completed").length,
    cancelled: filtered.filter((a) => a.status === "Cancelled").length,
  };

  return (
    <AdminLayout active="admin-reports" onNav={onNav}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e3a5f] font-serif-display">Appointment Reports</h1>
        <p className="text-gray-500 text-sm">Filter and generate appointment summaries.</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-base font-bold text-[#1e3a5f] mb-4">Report Filters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all">
              {["All", "Pending", "Confirmed", "Completed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={() => setGenerated(true)}
          className="mt-4 px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152b47] transition-all"
        >
          Generate Report
        </button>
      </div>

      {generated && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: "Total", value: counts.total, color: "bg-[#1e3a5f] text-white" },
              { label: "Pending", value: counts.pending, color: "bg-amber-50 text-amber-700 border border-amber-200" },
              { label: "Confirmed", value: counts.confirmed, color: "bg-blue-50 text-blue-700 border border-blue-200" },
              { label: "Completed", value: counts.completed, color: "bg-green-50 text-green-700 border border-green-200" },
              { label: "Cancelled", value: counts.cancelled, color: "bg-red-50 text-red-700 border border-red-200" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-semibold opacity-80">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-[#1e3a5f]">Appointment Summary</h2>
              <span className="text-sm text-gray-500">{filtered.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["#", "Client Name", "Property", "Date", "Time", "Status"].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-6 py-3 font-medium text-gray-800">{a.clientName}</td>
                      <td className="px-6 py-3 text-gray-600">{a.propertyName}</td>
                      <td className="px-6 py-3 text-gray-600">{a.date}</td>
                      <td className="px-6 py-3 text-gray-600">{a.time}</td>
                      <td className="px-6 py-3">{statusBadge(a.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

// ─── Screen: User Management ──────────────────────────────────────────────────
const AdminUsersScreen = ({
  onNav,
  users,
  onToggleUser,
  onCreateAgent,
}: {
  onNav: (p: Page) => void;
  users: User[];
  onToggleUser: (id: number) => void;
  onCreateAgent: (details: { name: string; email: string; contactNumber: string; password: string }) => Promise<void>;
}) => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: "", email: "", contactNumber: "", password: "" });
  const [agentError, setAgentError] = useState("");
  const [agentSaving, setAgentSaving] = useState(false);
  const submitAgent = async (event: React.FormEvent) => {
    event.preventDefault();
    setAgentError("");
    setAgentSaving(true);
    try {
      await onCreateAgent(agentForm);
      setAgentForm({ name: "", email: "", contactNumber: "", password: "" });
      setShowAgentForm(false);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Could not create Agent account.");
    } finally {
      setAgentSaving(false);
    }
  };

  const filtered = users
    .filter((u) => roleFilter === "All" || u.role === roleFilter)
    .filter((u) => search === "" || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout active="admin-users" onNav={onNav}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] font-serif-display">User Management</h1>
          <p className="text-gray-500 text-sm">{users.length} registered users</p>
        </div>
        <button type="button" onClick={() => { setAgentError(""); setShowAgentForm(true); }} className="px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#294d78] transition-colors">+ Add Agent</button>
      </div>
      {showAgentForm && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div><h2 className="text-lg font-bold text-[#1e3a5f]">Create Agent Account</h2><p className="text-sm text-gray-500">The account will be saved with the Agent role.</p></div>
            <button type="button" onClick={() => setShowAgentForm(false)} className="text-gray-500 hover:text-gray-800">✕</button>
          </div>
          <form onSubmit={submitAgent} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input required maxLength={120} value={agentForm.name} onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })} placeholder="Full name" className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
            <input required type="email" maxLength={190} value={agentForm.email} onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })} placeholder="Email address" className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
            <input required type="tel" value={agentForm.contactNumber} onChange={(e) => setAgentForm({ ...agentForm, contactNumber: e.target.value })} placeholder="Contact number" className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
            <input required type="password" minLength={8} maxLength={128} value={agentForm.password} onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })} placeholder="Temporary password (at least 8 characters)" className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
            {agentError && <p className="sm:col-span-2 text-sm text-red-600">{agentError}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAgentForm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancel</button>
              <button type="submit" disabled={agentSaving} className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold disabled:opacity-60">{agentSaving ? "Creating..." : "Create Agent"}</button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all"
          />
          <div className="flex gap-2">
            {["All", "Admin", "Agent", "Client"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  roleFilter === r ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white text-gray-600 border-gray-200 hover:border-[#3a8dde]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Name", "Email", "Role", "Account Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-bold">
                        {u.name[0]}
                      </div>
                      <span className="font-semibold text-gray-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">{statusBadge(u.role)}</td>
                  <td className="px-6 py-4">{statusBadge(u.status)}</td>
                  <td className="px-6 py-4">
                    {u.role !== "Admin" && (
                      <button
                        onClick={() => onToggleUser(u.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          u.status === "Active"
                            ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                            : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {u.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

// ─── Screen: System Settings ──────────────────────────────────────────────────
const AdminSettingsScreen = ({ onNav }: { onNav: (p: Page) => void }) => {
  const [settings, setSettings] = useState({
    systemName: "Velora — Real Estate Property Viewing System",
    adminEmail: "admin@velora.com",
    maxAppointments: 5,
    requireApproval: true,
    minPasswordLength: 8,
    requireUppercase: true,
    requireNumber: true,
    defaultRole: "Client",
    allowRegistration: true,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <AdminLayout active="admin-settings" onNav={onNav}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e3a5f] font-serif-display">System Settings</h1>
        <p className="text-gray-500 text-sm">Configure system-wide settings and preferences.</p>
      </div>
      {saved && (
        <div className="mb-5 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg font-medium">
          Settings saved successfully!
        </div>
      )}
      <div className="space-y-6 max-w-2xl">
        {/* System Name */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-[#1e3a5f] mb-4">System Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">System Name</label>
              <input type="text" value={settings.systemName} onChange={(e) => setSettings({ ...settings, systemName: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Admin Email</label>
              <input type="email" value={settings.adminEmail} onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all" />
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-[#1e3a5f] mb-4">Account Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max Appointments per Client</label>
              <input type="number" value={settings.maxAppointments} onChange={(e) => setSettings({ ...settings, maxAppointments: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={settings.requireApproval} onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })} className="w-4 h-4 accent-[#1e3a5f]" />
              <span className="text-sm text-gray-700">Require agent approval for appointments</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={settings.allowRegistration} onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })} className="w-4 h-4 accent-[#1e3a5f]" />
              <span className="text-sm text-gray-700">Allow client self-registration</span>
            </label>
          </div>
        </div>

        {/* Password Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-[#1e3a5f] mb-4">Password Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Minimum Password Length</label>
              <input type="number" value={settings.minPasswordLength} onChange={(e) => setSettings({ ...settings, minPasswordLength: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={settings.requireUppercase} onChange={(e) => setSettings({ ...settings, requireUppercase: e.target.checked })} className="w-4 h-4 accent-[#1e3a5f]" />
              <span className="text-sm text-gray-700">Require uppercase letters</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={settings.requireNumber} onChange={(e) => setSettings({ ...settings, requireNumber: e.target.checked })} className="w-4 h-4 accent-[#1e3a5f]" />
              <span className="text-sm text-gray-700">Require at least one number</span>
            </label>
          </div>
        </div>

        {/* User Role Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-[#1e3a5f] mb-4">User Role Settings</h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Default Role for New Users</label>
            <select value={settings.defaultRole} onChange={(e) => setSettings({ ...settings, defaultRole: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:border-[#3a8dde] focus:ring-2 focus:ring-[#3a8dde]/20 transition-all">
              <option>Client</option>
              <option>Agent</option>
            </select>
          </div>
        </div>

        <button onClick={handleSave} className="px-8 py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152b47] transition-all shadow-sm">
          Save Changes
        </button>
      </div>
    </AdminLayout>
  );
};

// ─── Saved data (kept in this browser, so a refresh does not wipe accounts) ──────
const STORE = {
  appointments: "velora.appointments",
  properties: "velora.properties",
  favorites: "velora.favorites",
  ratings: "velora.ratings",
  notifications: "velora.notifications",
  session: "velora.session",
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the app still works, it just won't remember */
  }
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("login");
  const [pageHistory, setPageHistory] = useState<Page[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>(() => loadStored(STORE.appointments, APPOINTMENTS_INIT));
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile>(CLIENT_PROFILE_INIT);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loggedInId, setLoggedInId] = useState<number | null>(null);
  const [authToken, setAuthToken] = useState<string>(() => {
    try { return localStorage.getItem("velora.authToken") || ""; } catch { return ""; }
  });
  const [favorites, setFavorites] = useState<Favorite[]>(() => loadStored(STORE.favorites, FAVORITES_INIT));
  const [ratings, setRatings] = useState<Rating[]>(() => loadStored(STORE.ratings, []));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadStored(STORE.notifications, []));

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  });

  useEffect(() => saveStored(STORE.appointments, appointments), [appointments]);
  useEffect(() => saveStored(STORE.favorites, favorites), [favorites]);
  useEffect(() => {
    let active = true;
    const loadProperties = async () => {
      setPropertiesLoading(true);
      setPropertiesError("");
      try {
        const response = await fetch(`${API_URL}/api/v1/properties`);
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success || !Array.isArray(data.properties)) {
          throw new Error(data?.message || "Could not load properties from the server.");
        }
        const normalized: Property[] = data.properties.map((item: any) => {
          let images: string[] = [];
          if (Array.isArray(item.images)) images = item.images.filter(Boolean).map(String);
          else if (typeof item.images === "string") {
            try { images = JSON.parse(item.images).filter(Boolean).map(String); } catch { images = []; }
          }
          const image = String(item.image || images[0] || "");
          return {
            id: Number(item.id),
            name: String(item.name || ""),
            type: String(item.type || ""),
            location: String(item.location || ""),
            price: Number(item.price || 0),
            bedrooms: Number(item.bedrooms || 0),
            bathrooms: Number(item.bathrooms || 0),
            size: Number(item.size || 0),
            description: String(item.description || ""),
            image,
            images: images.length ? images : image ? [image] : [],
            status: item.status,
          };
        });
        if (active) setProperties(normalized);
      } catch (error) {
        if (active) setPropertiesError(error instanceof Error ? error.message : "Could not connect to the Velora server.");
      } finally {
        if (active) setPropertiesLoading(false);
      }
    };
    loadProperties();
    return () => { active = false; };
  }, []);
  useEffect(() => saveStored(STORE.ratings, ratings), [ratings]);
  useEffect(() => { saveStored("velora.notifications", notifications); window.dispatchEvent(new Event("velora-notifications-updated")); }, [notifications]);
  useEffect(() => {
    fetch(`${API_URL}/api/v1/ratings`, { headers: authHeaders() }).then((res) => res.ok ? res.json() : null).then((data) => {
      if (data?.success && Array.isArray(data.ratings)) {
        setRatings((local) => {
          const merged = [...data.ratings];
          for (const item of local) {
            if (!merged.some((saved: Rating) => saved.appointmentId === item.appointmentId && saved.clientId === item.clientId && saved.targetType === item.targetType)) merged.push(item);
          }
          return merged;
        });
      }
    }).catch(() => { /* Ratings remain available from this browser's local storage. */ });
  }, []);
  useEffect(() => {
    if (!authToken) return;
    let active = true;
    fetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success || !data.user) throw new Error("Session expired");
        if (!active) return;
        const user: User = data.user;
        setCurrentUserId(user.id);
        setCurrentUser(user);
        setLoggedInId(user.id);
        setClientProfile({ name: user.name, email: user.email, contact: user.contactNumber });
        const appointmentsResponse = await fetch(`${API_URL}/api/v1/appointments`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const appointmentsData = await appointmentsResponse.json().catch(() => null);
        if (!appointmentsResponse.ok || !appointmentsData?.success || !Array.isArray(appointmentsData.appointments)) {
          throw new Error(appointmentsData?.message || "Could not load appointments.");
        }
        if (active) setAppointments(appointmentsData.appointments);
        setPage(user.role === "Client" ? "client-home" : user.role === "Agent" ? "admin-appointments" : "admin-dashboard");
        try { localStorage.setItem(STORE.session, JSON.stringify(user.id)); } catch {}
        if (user.role === "Admin") {
          const usersResponse = await fetch(`${API_URL}/api/v1/users`, { headers: { Authorization: `Bearer ${authToken}` } });
          const usersData = await usersResponse.json().catch(() => null);
          if (usersResponse.ok && usersData?.success && active) setUsers(usersData.users);
        }
      })
      .catch(() => {
        if (!active) return;
        setAuthToken("");
        try { localStorage.removeItem("velora.authToken"); localStorage.removeItem(STORE.session); } catch {}
      });
    return () => { active = false; };
  }, []);

  const navigate = (p: Page) => {
    if (currentUser?.role === "Agent" && p !== "login" && p !== "admin-appointments") return;
    if (p === "login") {
      setLoggedInId(null);
      setCurrentUserId(0);
      setCurrentUser(null);
      setAuthToken("");
      setUsers([]);
      setPageHistory([]);
      try { localStorage.removeItem("velora.authToken"); localStorage.removeItem(STORE.session); } catch {}
    } else {
      setPageHistory((previous) => page === p ? previous : [...previous, page]);
    }
    setPage(p);
    setEditingProperty(null);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (pageHistory.length === 0) return;
    const previousPage = pageHistory[pageHistory.length - 1];
    setPageHistory((previous) => previous.slice(0, -1));
    setPage(previousPage);
    setEditingProperty(null);
    window.scrollTo(0, 0);
  };

  const handleLogin = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success || !data.user || !data.token) {
      throw new Error(data?.message || "Incorrect email or password.");
    }
    const user: User = data.user;
    setAuthToken(data.token);
    try {
      localStorage.setItem("velora.authToken", data.token);
      localStorage.setItem(STORE.session, JSON.stringify(user.id));
    } catch {}
    setCurrentUserId(user.id);
    setCurrentUser(user);
    setLoggedInId(user.id);
    const appointmentsResponse = await fetch(`${API_URL}/api/v1/appointments`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const appointmentsData = await appointmentsResponse.json().catch(() => null);
    if (!appointmentsResponse.ok || !appointmentsData?.success || !Array.isArray(appointmentsData.appointments)) {
      throw new Error(appointmentsData?.message || "Could not load appointments.");
    }
    setAppointments(appointmentsData.appointments);
    setSelectedAppointment(null);
    setClientProfile({ name: user.name, email: user.email, contact: user.contactNumber });
    if (user.role === "Admin") {
      const usersResponse = await fetch(`${API_URL}/api/v1/users`, { headers: { Authorization: `Bearer ${data.token}` } });
      const usersData = await usersResponse.json().catch(() => null);
      if (!usersResponse.ok || !usersData?.success) throw new Error(usersData?.message || "Could not load user accounts.");
      setUsers(usersData.users);
    }
    setPage(user.role === "Client" ? "client-home" : user.role === "Agent" ? "admin-appointments" : "admin-dashboard");
    window.scrollTo(0, 0);
  };

  // The flow navigator can jump straight to detail pages, so fall back to sample records.
  const shownProperty = selectedProperty ?? properties.find((p) => p.status === "Available") ?? properties[0] ?? null;
  const shownAppointment =
    selectedAppointment ?? appointments.find((a) => a.clientId === currentUserId) ?? null;

  const addAppointment = async (appt: Omit<Appointment, "id" | "clientId">) => {
    const response = await fetch(`${API_URL}/api/v1/appointments`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(appt),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success || !data.appointment) {
      throw new Error(data?.message || "Could not save appointment to MySQL.");
    }
    const saved: Appointment = data.appointment;
    setAppointments((prev) => [...prev.filter((item) => item.id !== saved.id), saved]);
    notifyAppointment({
      appointmentId: saved.id,
      type: "booked",
    }, authToken);
  };

  const updateAppointment = async (updated: Appointment) => {
    if (!currentUser || (currentUser.role !== "Admin" && !(currentUser.role === "Agent" && updated.assignedAgentId === currentUser.id))) {
      alert("You are not allowed to update this appointment.");
      return;
    }
    const response = await fetch(`${API_URL}/api/v1/appointments/${updated.id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(currentUser.role === "Admin"
        ? { status: updated.status, assignedAgentId: updated.assignedAgentId ?? null }
        : { status: updated.status }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success || !data.appointment) {
      alert(data?.message || "Could not update appointment.");
      return;
    }

    const saved: Appointment = data.appointment;
    const old = appointments.find((a) => a.id === saved.id);
    setAppointments((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
    setSelectedAppointment((sel) => (sel && sel.id === saved.id ? saved : sel));

    if (old && old.status !== "Confirmed" && saved.status === "Confirmed") {
      setNotifications((prev) => [...prev, {
        id: `notification-${saved.id}-${Date.now()}`,
        clientId: saved.clientId,
        appointmentId: saved.id,
        message: "Na-confirm na ang viewing mo.",
        createdAt: new Date().toISOString(),
        read: false,
      }]);
    }

    const emailTypes: Record<string, "confirmed" | "cancelled" | "completed"> = {
      Confirmed: "confirmed",
      Cancelled: "cancelled",
      Completed: "completed",
    };
    if (old && old.status !== saved.status && emailTypes[saved.status]) {
      const client = users.find((u) => u.id === saved.clientId);
      if (client) {
        notifyAppointment({
          appointmentId: saved.id,
          type: emailTypes[saved.status],
        }, authToken);
      }
    }
  };

  const submitRatings = async (
    items: Omit<Rating, "id" | "createdAt">[]
  ): Promise<boolean> => {
    console.log("[VELORA] Sending POST /api/v1/ratings");
    console.log("[VELORA] Payload:", items);
    console.log("[VELORA] Auth token available:", Boolean(authToken));

    if (!authToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/v1/ratings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ ratings: items }),
      });
    } catch (error) {
      console.error("[VELORA] Network error:", error);
      throw new Error("Cannot connect to the Velora server. Make sure server.mjs is running.");
    }

    console.log("[VELORA] POST response status:", response.status);
    const data = await response.json().catch(() => null);
    console.log("[VELORA] POST response data:", data);

    if (!response.ok || !data?.success || !Array.isArray(data.ratings)) {
      throw new Error(data?.message || `Could not save ratings. Server status: ${response.status}`);
    }

    setRatings((previous) => {
      const merged = previous.filter((item) =>
        !data.ratings.some((saved: Rating) =>
          saved.appointmentId === item.appointmentId &&
          saved.clientId === item.clientId &&
          saved.targetType === item.targetType
        )
      );
      return [...data.ratings, ...merged];
    });

    console.log("[VELORA] Ratings successfully saved to MySQL.");
    return true;
  };

  const addProperty = async (p: Omit<Property, "id">) => {
    if (!authToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const response = await fetch(`${API_URL}/api/v1/properties`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...p, images: p.images?.length ? p.images : p.image ? [p.image] : [] }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success || !data.property) {
      throw new Error(data?.message || "Could not add property to MySQL.");
    }
    const item = data.property;
    const saved: Property = { ...p, ...item, id: Number(item.id), price: Number(item.price), bedrooms: Number(item.bedrooms), bathrooms: Number(item.bathrooms), size: Number(item.size), images: Array.isArray(item.images) ? item.images : p.images || [] };
    setProperties((prev) => [...prev, saved]);
    setPropertiesError("");
  };

  const addUser = async (u: { name: string; email: string; contactNumber: string }, password: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...u, password }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) throw new Error(data?.message || "Could not create your account.");
  };

  const updateProperty = async (updated: Property) => {
    const response = await fetch(`${API_URL}/api/v1/properties/${updated.id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ ...updated, images: updated.images?.length ? updated.images : updated.image ? [updated.image] : [] }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Could not update property in MySQL.");
    }
    const saved: Property = { ...updated, ...(data.property || {}) };
    setProperties((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    // Keep appointment property names in sync when a property is renamed.
    setAppointments((prev) =>
      prev.map((a) => (a.propertyId === saved.id ? { ...a, propertyName: saved.name } : a))
    );
    setSelectedProperty((sel) => (sel && sel.id === saved.id ? saved : sel));
    setPropertiesError("");
  };

  // Archive instead of permanently deleting: appointments and other history remain linked.
  const deleteProperty = async (id: number) => {
    const response = await fetch(`${API_URL}/api/v1/properties/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Could not archive property.");
    }
    setProperties((prev) => prev.map((property) =>
      property.id === id ? { ...property, status: "Inactive" } : property
    ));
    setSelectedProperty((prev) => (prev?.id === id ? null : prev));
    setPropertiesError("");
  };

  // Saving the profile updates the greeting/nav everywhere, the client's appointments and the admin user list.
  const saveClientProfile = async (next: ClientProfile) => {
    const response = await fetch(`${API_URL}/api/v1/auth/profile`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ name: next.name, email: next.email, contactNumber: next.contact }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) throw new Error(data?.message || "Could not update your profile.");
    setClientProfile(next);
    setUsers((prev) => prev.map((u) => u.id === currentUserId ? { ...u, name: next.name, email: next.email, contactNumber: next.contact } : u));
    setAppointments((prev) => prev.map((a) =>
      a.clientId === currentUserId ? { ...a, clientName: next.name, contactNumber: next.contact } : a
    ));
  };

  // Heart button: saves the property for the logged-in client, or removes it if it was already saved.
  const toggleFavorite = (propertyId: number) => {
    setFavorites((prev) => {
      const existing = prev.find((f) => f.clientId === currentUserId && f.propertyId === propertyId);
      if (existing) return prev.filter((f) => f.id !== existing.id);
      return [...prev, { id: nextId(prev), clientId: currentUserId, propertyId, dateSaved: todayLocal() }];
    });
  };
  const myFavorites = favorites.filter((f) => f.clientId === currentUserId);
  const myFavoriteIds = myFavorites.map((f) => f.propertyId);

  const createAgent = async (details: { name: string; email: string; contactNumber: string; password: string }) => {
    const response = await fetch(`${API_URL}/api/v1/users/agents`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(details),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success || !data.user) {
      throw new Error(data?.message || "Could not create Agent account.");
    }
    setUsers((previous) => [data.user, ...previous]);
  };

  const toggleUser = async (id: number) => {
    const response = await fetch(`${API_URL}/api/v1/users/${id}/toggle`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      alert(data?.message || "Could not update this account.");
      return;
    }
    setUsers((prev) => prev.map((u) => u.id === id ? data.user : u));
  };

  const openNotification = (notification: AppNotification) => {
    setNotifications((prev) => prev.map((item) => item.id === notification.id ? { ...item, read: true } : item));
    const appointment = appointments.find((item) => item.id === notification.appointmentId && item.clientId === currentUserId);
    if (appointment) {
      setSelectedAppointment(appointment);
      setPage("appointment-details");
      window.scrollTo(0, 0);
    } else {
      navigate("my-appointments");
    }
  };
  const myNotifications = notifications.filter((notification) => notification.clientId === currentUserId);

  const screens: Record<Page, ReactNode> = {
    login: <LoginScreen onNav={navigate} onLogin={handleLogin} />,
    register: <RegisterScreen onNav={navigate} onRegister={addUser} />,
    "client-home": (
      <ClientHomeScreen
        onNav={navigate}
        properties={properties}
        onSelectProperty={setSelectedProperty}
        clientName={clientProfile.name}
        favoriteIds={myFavoriteIds}
        onToggleFavorite={toggleFavorite}
      />
    ),
    "property-details": (
      <PropertyDetailsScreen
        onNav={navigate}
        property={shownProperty}
        clientName={clientProfile.name}
        isFavorite={shownProperty ? myFavoriteIds.includes(shownProperty.id) : false}
        onToggleFavorite={toggleFavorite}
        ratings={ratings}
      />
    ),
    "schedule-viewing": (
      <ScheduleViewingScreen
        onNav={navigate}
        property={shownProperty}
        appointments={appointments}
        profile={clientProfile}
        onSubmit={addAppointment}
      />
    ),
    "my-appointments": (
      <MyAppointmentsScreen
        onNav={navigate}
        appointments={appointments}
        onSelectAppointment={setSelectedAppointment}
        clientName={clientProfile.name}
        clientId={currentUserId}
      />
    ),
    "appointment-details": (
      <AppointmentDetailsScreen
        onNav={navigate}
        appointment={shownAppointment}
        clientName={clientProfile.name}
        currentUserId={currentUserId}
        ratings={ratings}
        onSubmitRatings={submitRatings}
      />
    ),
    favorites: (
      <FavoritesScreen
        onNav={navigate}
        properties={properties}
        favorites={myFavorites}
        onToggleFavorite={toggleFavorite}
        onSelectProperty={setSelectedProperty}
        clientName={clientProfile.name}
      />
    ),
    "client-profile": (
      <ClientProfileScreen onNav={navigate} savedProfile={clientProfile} onSaveProfile={saveClientProfile} />
    ),
    "admin-dashboard": (
      <AdminDashboardScreen onNav={navigate} properties={properties} appointments={appointments} />
    ),
    "admin-properties": (
      <AdminPropertiesScreen
        onNav={navigate}
        properties={properties}
        onAddProperty={addProperty}
        onUpdateProperty={updateProperty}
        onDeleteProperty={deleteProperty}
        setEditingProperty={setEditingProperty}
        editingProperty={editingProperty}
        propertiesLoading={propertiesLoading}
        propertiesError={propertiesError}
      />
    ),
    "admin-appointments": (
      <AdminAppointmentsScreen
        onNav={navigate}
        appointments={appointments}
        onUpdateAppointment={updateAppointment}
        agents={users.filter((u) => u.role === "Agent" && u.status === "Active")}
        isAgent={currentUser?.role === "Agent"}
        userName={currentUser?.name || "Admin User"}
      />
    ),
    "admin-reports": (
      <AdminReportsScreen onNav={navigate} appointments={appointments} />
    ),
    "admin-users": (
      <AdminUsersScreen onNav={navigate} users={users} onToggleUser={toggleUser} onCreateAgent={createAgent} />
    ),
    "admin-settings": <AdminSettingsScreen onNav={navigate} />,
    "add-property": <></>,
    "edit-property": <></>,
  };

  const visiblePage = currentUser?.role === "Agent" && page !== "login" ? "admin-appointments" : page;

  return (
    <>
      {screens[visiblePage]}
      {page !== "login" && page !== "register" && pageHistory.length > 0 && (
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back to previous page"
          title="Back to previous page"
          className="fixed bottom-6 right-6 z-[100] inline-flex items-center gap-2 rounded-full bg-[#1e3a5f] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#294d78] focus:outline-none focus:ring-2 focus:ring-[#3a8dde] focus:ring-offset-2"
        >
          <span aria-hidden="true" className="text-lg leading-none">←</span>
          Back
        </button>
      )}
    </>
  );
}

