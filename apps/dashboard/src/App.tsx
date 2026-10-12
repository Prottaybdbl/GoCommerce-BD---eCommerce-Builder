import React, { useState, useEffect } from "react";
import { Navbar, AdminRole } from "./components/Navbar.js";
import { Sidebar, NavTab } from "./components/Sidebar.js";
import { AnalyticsOverviewView } from "./views/AnalyticsOverviewView.js";
import { OrdersView, Order } from "./views/OrdersView.js";
import { IncompleteView, IncompleteOrder } from "./views/IncompleteView.js";
import { ProductsView, Product } from "./views/ProductsView.js";
import { CourierView, Remittance } from "./views/CourierView.js";
import { AuthView } from "./views/AuthView.js";
import { SettingsView } from "./views/SettingsView.js";
import { OnboardingModal } from "./components/OnboardingModal.js";
import { LanguageProvider } from "./context/LanguageContext.js";

// Lazy-loaded views for code splitting and instant initial page load
const ThemeView = React.lazy(() => import("./views/ThemeView.js").then((m) => ({ default: m.ThemeView })));
const SuperAdminView = React.lazy(() => import("./views/SuperAdminView.js").then((m) => ({ default: m.SuperAdminView })));
const SuperPackagesView = React.lazy(() => import("./views/SuperPackagesView.js").then((m) => ({ default: m.SuperPackagesView })));
const SuperTrialsView = React.lazy(() => import("./views/SuperTrialsView.js").then((m) => ({ default: m.SuperTrialsView })));
const SuperPaidUsersView = React.lazy(() => import("./views/SuperPaidUsersView.js").then((m) => ({ default: m.SuperPaidUsersView })));

const ViewLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<AdminRole>("store_admin");
  const [currentTab, setCurrentTab] = useState<NavTab>("analytics");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    setIsMobileSidebarOpen(false);
  };

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [incompleteLeads, setIncompleteLeads] = useState<IncompleteOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [storeConfig, setStoreConfig] = useState<any>({
    name: "",
    subdomain: "",
    themeArchetype: "viral-funnel",
    themeConfig: {},
    settings: {},
  });

  // Load initial data from API
  const fetchData = async () => {
    try {
      // 1. Fetch Store Config
      const configRes = await fetch("/api/storefront/config");
      if (configRes.ok) {
        const configData = await configRes.json();
        setStoreConfig(configData);
      }

      // 2. Fetch Orders
      const ordersRes = await fetch("/api/admin/orders");
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.data || []);
      }

      // 3. Fetch Incomplete Leads
      const leadsRes = await fetch("/api/admin/incomplete-orders");
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setIncompleteLeads(leadsData.data || []);
      }

      // 4. Fetch Products
      const productsRes = await fetch("/api/storefront/products");
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(
          (productsData.data || []).map((p: any) => ({
            id: p.id,
            title: p.title,
            banglaTitle: p.banglaTitle,
            slug: p.slug,
            price: p.variants?.[0]?.price || 0,
            compareAtPrice: p.variants?.[0]?.compareAtPrice,
            stockQuantity: p.variants?.[0]?.stockQuantity || 0,
            imageUrl: p.images?.[0]?.url,
            isActive: p.isActive,
          }))
        );
      }

      // 5. Fetch Remittances
      const remRes = await fetch("/api/admin/courier/remittances");
      if (remRes.ok) {
        const remData = await remRes.json();
        setRemittances(remData.data || []);
      }
    } catch (err) {
      console.warn("API load note:", err);
    }
  };

  // Check initial auth session
  useEffect(() => {
    const checkAuthSession = async () => {
      try {
        if (typeof window !== "undefined" && window.location.pathname === "/login") {
          window.history.replaceState({}, document.title, "/");
        }
        const params = new URLSearchParams(window.location.search);
        const authToken = params.get("auth_token");
        if (authToken) {
          try {
            localStorage.setItem("gocom_auth_token", authToken);
            localStorage.setItem("gocom_session_token", authToken);
            sessionStorage.setItem("gocom_token", authToken);
          } catch {}
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        const activeToken = authToken || (function() {
          try {
            return (
              localStorage.getItem("gocom_session_token") ||
              localStorage.getItem("gocom_auth_token") ||
              sessionStorage.getItem("gocom_token")
            );
          } catch { return null; }
        })();
        const headers: Record<string, string> = {};
        if (activeToken) {
          headers["Authorization"] = `Bearer ${activeToken}`;
        }

        const res = await fetch("/api/auth/me", { credentials: "include", headers });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            if (data.token) {
              try {
                localStorage.setItem("gocom_session_token", data.token);
                localStorage.setItem("gocom_auth_token", data.token);
                sessionStorage.setItem("gocom_token", data.token);
              } catch {}
            }
            setIsAuthenticated(true);
            setCurrentUser(data.user);
            setNeedsOnboarding(Boolean(data.needsOnboarding));
            if (data.store) {
              setStoreConfig((prev: any) => ({ ...prev, ...data.store }));
            }
            const isSuper = data.user?.role === "super_admin";
            setCurrentRole(isSuper ? "super_admin" : "store_admin");
            if (isSuper) {
              setCurrentTab("super_overview");
            } else {
              setCurrentTab("analytics");
            }
            if (
              typeof window !== "undefined" &&
              (window.location.pathname === "/login" ||
                window.location.pathname === "/create-store" ||
                window.location.pathname === "/signup" ||
                window.location.search.includes("mode="))
            ) {
              window.history.replaceState({}, document.title, "/");
            }
            fetchData();
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        // Fallback for dev mode
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuthSession();

    // Phase 5: SSE Realtime Order Stream
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/v1/realtime/orders");

      eventSource.addEventListener("order_created", () => {
        fetchData();
      });

      eventSource.addEventListener("call_status_changed", () => {
        fetchData();
      });
    } catch (e) {
      console.warn("Realtime order stream note:", e);
    }

    return () => {
      eventSource?.close();
    };
  }, []);

  const handleLogout = async () => {
    try {
      const activeToken = (function () {
        try {
          return (
            localStorage.getItem("gocom_session_token") ||
            localStorage.getItem("gocom_auth_token") ||
            sessionStorage.getItem("gocom_token")
          );
        } catch {
          return null;
        }
      })();
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers,
        credentials: "include",
      });
    } catch {
      // ignore
    } finally {
      try {
        localStorage.removeItem("gocom_session_token");
        localStorage.removeItem("gocom_auth_token");
        sessionStorage.removeItem("gocom_token");
        sessionStorage.clear();
        document.cookie = "gocom_logged_in=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
        const hostname = window.location.hostname;
        const parts = hostname.split(".");
        if (parts.length >= 2) {
          const rootDomain = parts.slice(-2).join(".");
          document.cookie = `gocom_logged_in=; Path=/; Domain=.${rootDomain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      } catch {}
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentRole("store_admin");
      setCurrentTab("analytics");
      setOrders([]);
      setIncompleteLeads([]);
      setProducts([]);
      setRemittances([]);
      setNeedsOnboarding(false);
      if (typeof window !== "undefined") {
        if (window.location.pathname !== "/" || window.location.search !== "") {
          window.history.replaceState({}, document.title, "/");
        }
      }
    }
  };

  // Action Handlers
  const handleUpdateCallStatus = async (orderId: string, callStatus: string, notes?: string) => {
    const res = await fetch(`/api/admin/orders/${orderId}/call-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callStatus, callNotes: notes }),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleVerifyAdvance = async (orderId: string, advanceTrxId: string, advanceAmount: number) => {
    const res = await fetch(`/api/admin/orders/${orderId}/advance-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        advanceMethod: "bkash_personal",
        advanceSenderPhone: "+8801711223344",
        advanceTrxId,
        advanceAmount,
        isVerified: true,
      }),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleBookCourier = async (orderId: string) => {
    const res = await fetch("/api/admin/courier/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        courierProvider: "steadfast",
      }),
    });
    if (res.ok) {
      await fetchData();
    } else {
      const err = await res.json();
      alert(`কুরিয়ার বুকিং ত্রুটি: ${err.details || err.error}`);
    }
  };

  const handleExportCsv = () => {
    window.open("/api/admin/courier/export-csv", "_blank");
  };

  const handleAddProduct = async (productData: any) => {
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#141522] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-[#405189] border-t-white rounded-full animate-spin"></div>
        <p className="text-xs text-gray-400 font-medium">নিরাপদ সেশন যাচাই করা হচ্ছে...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const isSignupMode =
      typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).get("mode") === "signup" ||
        window.location.pathname === "/create-store" ||
        window.location.pathname === "/signup");

    return (
      <AuthView
        initialMode={isSignupMode ? "signup" : "login"}
        onAuthSuccess={(user, store, reqOnboarding) => {
          setIsAuthenticated(true);
          setCurrentUser(user);
          if (store) {
            setStoreConfig((prev: any) => ({ ...prev, ...store }));
          }
          if (reqOnboarding !== undefined) {
            setNeedsOnboarding(Boolean(reqOnboarding));
          } else if (
            store?.settings?.onboardingCompleted === false ||
            !store?.phone ||
            store?.phone === "+8801700000000"
          ) {
            setNeedsOnboarding(true);
          } else {
            setNeedsOnboarding(false);
          }
          const isSuper = user?.role === "super_admin";
          setCurrentRole(isSuper ? "super_admin" : "store_admin");
          if (isSuper) {
            setCurrentTab("super_overview");
          } else {
            setCurrentTab("analytics");
          }
          if (typeof window !== "undefined" && (window.location.pathname !== "/" || window.location.search !== "")) {
            window.history.replaceState({}, document.title, "/");
          }
          fetchData();
        }}
      />
    );
  }

  const pendingCallsCount = orders.filter((o) => o.callStatus === "pending").length;

  return (
    <LanguageProvider>
      <div className="relative min-h-screen">
        {/* Main Dashboard Layout (Blurred & Disabled when needsOnboarding is true) */}
        <div
          className={`flex min-h-screen bg-[#f3f3f9] text-[#495057] font-sans antialiased transition-all duration-300 ${
            needsOnboarding
              ? "filter blur-[5px] brightness-[0.95] select-none pointer-events-none overflow-hidden h-screen"
              : ""
          }`}
        >
          {/* Velzon Material Dark Left Sidebar */}
          <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          orderCount={pendingCallsCount}
          incompleteCount={incompleteLeads.length}
          storeName={storeConfig.name}
          subdomain={storeConfig.subdomain}
          currentRole={currentRole}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Layout Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Velzon Material Topbar Header */}
          <Navbar
            currentRole={currentRole}
            onToggleSidebar={handleToggleSidebar}
            isSidebarCollapsed={isSidebarCollapsed}
            storeName={storeConfig.name}
            subdomain={storeConfig.subdomain}
            orderCount={pendingCallsCount}
            incompleteCount={incompleteLeads.length}
            onSelectTab={handleSelectTab}
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          {/* Velzon Content Canvas */}
          <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1600px] w-full mx-auto overflow-y-auto">
            <React.Suspense fallback={<ViewLoader />}>
              {/* COMMON SETTINGS VIEW (FOR BOTH SUPER ADMIN & STORE ADMIN) */}
              {currentTab === "settings" ? (
                <SettingsView
                  currentUser={currentUser}
                  currentRole={currentRole}
                  storeConfig={storeConfig}
                />
              ) : (
                <>
                  {/* STORE ADMIN VIEWS */}
                  {currentRole === "store_admin" && (
                    <>
                      {currentTab === "analytics" && (
                        <AnalyticsOverviewView
                          orders={orders}
                          incompleteLeads={incompleteLeads}
                          products={products}
                          onSelectTab={setCurrentTab}
                          onExportCsv={handleExportCsv}
                          storeConfig={storeConfig}
                        />
                      )}

                      {currentTab === "orders" && (
                        <OrdersView
                          orders={orders}
                          onUpdateCallStatus={handleUpdateCallStatus}
                          onVerifyAdvance={handleVerifyAdvance}
                          onBookCourier={handleBookCourier}
                          onExportCsv={handleExportCsv}
                        />
                      )}

                      {currentTab === "incomplete" && (
                        <IncompleteView leads={incompleteLeads} />
                      )}

                      {currentTab === "products" && (
                        <ProductsView products={products} onAddProduct={handleAddProduct} />
                      )}

                      {currentTab === "courier" && (
                        <CourierView onExportCsv={handleExportCsv} remittances={remittances} />
                      )}

                      {currentTab === "theme" && <ThemeView />}
                    </>
                  )}

                  {/* SUPER ADMIN PLATFORM VIEWS */}
                  {currentRole === "super_admin" && (
                    currentTab === "super_packages" ? (
                      <SuperPackagesView />
                    ) : currentTab === "super_trials" ? (
                      <SuperTrialsView onNavigate={(tab) => setCurrentTab(tab)} />
                    ) : currentTab === "super_paid" ? (
                      <SuperPaidUsersView onNavigate={(tab) => setCurrentTab(tab)} />
                    ) : currentTab === "theme" ? (
                      <ThemeView />
                    ) : (
                      <SuperAdminView
                        onSwitchToPackages={() => setCurrentTab("super_packages")}
                        onNavigate={(tab) => setCurrentTab(tab)}
                      />
                    )
                  )}
                </>
              )}
            </React.Suspense>
          </main>
        </div>
      </div>

      {/* Mandatory Onboarding Modal Overlay */}
      {needsOnboarding && (
        <OnboardingModal
          currentUser={currentUser}
          currentStore={storeConfig}
          onComplete={(updatedUser, updatedStore) => {
            setCurrentUser(updatedUser);
            if (updatedStore) {
              setStoreConfig((prev: any) => ({ ...prev, ...updatedStore }));
            }
            setNeedsOnboarding(false);
            fetchData();
          }}
          onLogout={handleLogout}
        />
      )}
    </div>
  </LanguageProvider>
);
};
