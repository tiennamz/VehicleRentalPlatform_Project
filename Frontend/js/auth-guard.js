(function () {
  var STORE_PAGES = [
    "store-dashboard.html",
    "store-homepage.html",
    "vehicle-inventory.html",
    "store-rental-schedule.html",
    "store-rental-orders.html",
    "revenue.html",
    "store-operations.html",
    "fleet-management.html",
    "store_operations.html",
    "vehicle_management.html",
    "dashboard.html",
    "inventory.html"
  ];

  // Các trang thuê xe, đặt xe và quản lý tài khoản yêu cầu bắt buộc phải đăng nhập
  var AUTH_REQUIRED_PAGES = [
    "vehicle-search.html",
    "vehicles.html",
    "weekly-vehicle-schedule.html",
    "create-rental-order.html",
    "booking.html",
    "deposit-payment.html",
    "electronic-receipt.html",
    "receipt.html",
    "my-orders.html",
    "customer-account.html",
    "account.html",
    "customer-info.html",
    "customer-homepage.html",
    "complaint-handling.html",
    "regis_for_delivery.html",
    "store-registration.html"
  ];

  function getCookie(name) {
    var match = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + (days || 7) * 864e5).toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + expires + "; path=/; SameSite=Lax";
  }

  function clearCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; Max-Age=0; path=/; SameSite=Lax";
    document.cookie = name + "=; Max-Age=0; path=/";
  }

  function parseJwt(token) {
    try {
      var parts = String(token || "").split(".");
      if (parts.length !== 3) return null;
      var base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";
      var binary = atob(base64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      var json = new TextDecoder("utf-8").decode(bytes);
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function getInitials(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "TK";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function extractPageName(rawHref) {
    if (!rawHref) return "";
    var str = String(rawHref).trim();
    if (!str || str.charAt(0) === "#" || /^(mailto:|tel:|javascript:)/i.test(str)) {
      return "";
    }
    try {
      var u = new URL(str, window.location.href);
      if (
        window.location.protocol !== "file:" &&
        u.origin &&
        u.origin !== "null" &&
        u.origin !== window.location.origin &&
        u.host !== "vrp.local"
      ) {
        return "";
      }
      return decodeURIComponent(u.pathname || "").split("/").pop().toLowerCase();
    } catch (e) {
      var clean = str.split(/[?#]/)[0];
      return clean.split("/").pop().toLowerCase();
    }
  }

  function requiresAuthForPage(pageName) {
    if (!pageName) return false;
    return AUTH_REQUIRED_PAGES.indexOf(pageName) !== -1 || STORE_PAGES.indexOf(pageName) !== -1;
  }

  function clearAuthState() {
    clearCookie("access_token");
    clearCookie("vrp_logged_in");
    clearCookie("vrp_role");
    clearCookie("vrp_user_name");
    clearCookie("vrp_user_email");
    try {
      localStorage.removeItem("vrp_logged_in");
      localStorage.removeItem("vrp_role");
      localStorage.removeItem("vrp_user_name");
      localStorage.removeItem("vrp_user_email");
      sessionStorage.removeItem("access_token");
    } catch (e) {}
  }

  function logout() {
    clearAuthState();
    window.location.href = "login-register.html";
  }

  var token = getCookie("access_token");
  var payload = token ? parseJwt(token) : null;
  var isTokenValid = Boolean(payload && (!payload.exp || payload.exp * 1000 > Date.now()));

  var role = "guest";
  var roleIds = [];
  var userId = null;
  var userName = "";
  var userEmail = "";

  if (isTokenValid) {
    var rawRoles = payload.role_id || payload.role || [2];
    roleIds = (Array.isArray(rawRoles) ? rawRoles : [rawRoles]).map(function (r) {
      return Number(r);
    });
    if (payload.user_id != null) {
      userId = Number(payload.user_id) || null;
    }

    // role_id: 1 = Admin, 2 = Khách hàng, 3 = Nhân viên cửa hàng, 4 = Chủ cửa hàng
    if (roleIds.indexOf(1) !== -1) {
      role = "admin";
    } else if (roleIds.indexOf(4) !== -1 || roleIds.indexOf(3) !== -1) {
      role = "store";
    } else {
      role = "customer";
    }

    userEmail = payload.email || payload.sub || "";
    var cachedProfileName = "";
    try {
      if (userEmail) {
        var profRaw = localStorage.getItem("vrp_profile_data_" + userEmail.toLowerCase());
        if (profRaw) {
          var profParsed = JSON.parse(profRaw);
          if (profParsed && profParsed.fullname) cachedProfileName = String(profParsed.fullname).trim();
        }
      }
    } catch (e) {}
    userName = cachedProfileName || payload.name || (userEmail ? userEmail.split("@")[0] : "Tài khoản");

    setCookie("vrp_logged_in", "1", 7);
    setCookie("vrp_role", role, 7);
    setCookie("vrp_user_name", userName, 7);
    try {
      localStorage.setItem("vrp_logged_in", "1");
      localStorage.setItem("vrp_role", role);
      localStorage.setItem("vrp_user_name", userName);
      localStorage.setItem("vrp_user_email", userEmail);
    } catch (e) {}
  } else {
    clearAuthState();
  }

  var canStore = role === "store" || role === "admin";
  var currentPath = decodeURIComponent(window.location.pathname || "").split("/").pop().toLowerCase();

  // 1. Chặn truy cập trực tiếp vào các trang quản lý cửa hàng
  if (STORE_PAGES.indexOf(currentPath) !== -1) {
    if (!isTokenValid) {
      window.location.replace("login-register.html");
      return;
    }
    if (!canStore) {
      window.location.replace("index.html");
      return;
    }
  }

  // 2. Chặn người dùng chưa đăng nhập truy cập trực tiếp phần Thuê xe / Đặt xe / Tài khoản
  if (!isTokenValid && AUTH_REQUIRED_PAGES.indexOf(currentPath) !== -1) {
    window.location.replace("login-register.html");
    return;
  }

  // 3. Nếu chưa đăng nhập: vẫn cho xem xe ở trang chủ (index.html), nhưng khi bấm "Thuê xe"
  //    hoặc chuyển sang phần Thuê xe / Tìm xe thì chuyển ngay sang trang Đăng nhập
  if (!isTokenValid) {
    document.addEventListener(
      "click",
      function (e) {
        var target = e.target;
        if (!target || !target.closest) return;

        var rentBtn = target.closest(".btn-rent-vrp, [data-require-auth]");
        if (rentBtn) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          window.location.href = "login-register.html";
          return;
        }

        var link = target.closest("a[href]");
        if (link) {
          var pageName = extractPageName(link.getAttribute("href"));
          if (requiresAuthForPage(pageName)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            window.location.href = "login-register.html";
            return;
          }
        }
      },
      true
    );

    document.addEventListener(
      "submit",
      function (e) {
        var form = e.target;
        if (!form || !form.tagName || form.tagName.toUpperCase() !== "FORM") return;
        var actionPage = extractPageName(form.getAttribute("action") || "");
        if (requiresAuthForPage(actionPage)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          window.location.href = "login-register.html";
        }
      },
      true
    );
  }

  // 4. Ẩn ngay lập tức mục "Cửa hàng" bằng CSS khi không có quyền cửa hàng (không bị nháy giao diện)
  if (!canStore) {
    var style = document.createElement("style");
    style.id = "vrp-role-nav-style";
    style.textContent =
      '.nav-list a[href*="store-dashboard"], .nav-list a[href*="store-homepage"], #demoStoreAccess { display: none !important; }';
    (document.head || document.documentElement).appendChild(style);
  }

  function syncDom() {
    // Xử lý menu "Cửa hàng" trên thanh điều hướng
    var navList = document.querySelector(".nav-list");
    if (navList) {
      var storeItems = [];
      navList.querySelectorAll("li").forEach(function (li) {
        var a = li.querySelector("a");
        if (!a) return;
        var href = (a.getAttribute("href") || "").toLowerCase();
        var text = a.textContent.trim();
        if (
          href.indexOf("store-dashboard") !== -1 ||
          href.indexOf("store-homepage") !== -1 ||
          text === "Cửa hàng"
        ) {
          storeItems.push(li);
        }
      });

      if (!canStore) {
        storeItems.forEach(function (li) {
          li.remove();
        });
      } else if (storeItems.length > 1) {
        for (var i = 1; i < storeItems.length; i++) {
          storeItems[i].remove();
        }
      }
    }

    // Cập nhật tên thật, ảnh đại diện & chữ viết tắt trên góc phải Header khi đã đăng nhập
    if (isTokenValid && userName) {
      var initials = getInitials(userName);
      var savedAvatar = "";
      try {
        if (userEmail) {
          savedAvatar = localStorage.getItem("vrp_user_avatar_" + userEmail.toLowerCase()) || "";
        }
      } catch (e) {}

      var profileBtn = document.getElementById("userProfileBtn") || document.querySelector(".user-profile");
      if (profileBtn) {
        profileBtn.setAttribute("title", "Tài khoản " + userName);
        var avatarEl = profileBtn.querySelector(".user-avatar");
        var nameEl = profileBtn.querySelector(".user-name");
        if (avatarEl) {
          if (savedAvatar) {
            avatarEl.style.overflow = "hidden";
            avatarEl.style.padding = "0";
            avatarEl.innerHTML =
              '<img src="' +
              savedAvatar.replace(/"/g, "&quot;") +
              '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">';
          } else {
            avatarEl.textContent = initials;
          }
        }
        if (nameEl) nameEl.textContent = userName;
      }

      var blankHeading = document.querySelector("#view-blank h2");
      if (blankHeading) {
        blankHeading.textContent = "Tài khoản " + userName;
      }
    }

    // Gắn sự kiện Đăng xuất đồng bộ trên mọi trang
    document
      .querySelectorAll("#sidebarLogoutBtn, #storeLogoutBtn, .sidebar-logout-btn")
      .forEach(function (btn) {
        if (btn.dataset.vrpAuthLogoutBound) return;
        btn.dataset.vrpAuthLogoutBound = "1";
        btn.addEventListener(
          "click",
          function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            logout();
          },
          true
        );
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncDom);
  } else {
    syncDom();
  }
  window.addEventListener("load", syncDom);

  window.VRPAuth = {
    isLoggedIn: isTokenValid,
    userId: userId,
    role: role,
    roleIds: roleIds,
    canStore: canStore,
    userName: userName,
    userEmail: userEmail,
    logout: logout
  };
})();
