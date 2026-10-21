document.addEventListener("DOMContentLoaded", () => {
  const toast = document.getElementById("toast");
  const authSwitch = document.querySelector(".auth-switch");
  const introCopy = document.querySelector(".intro-copy");
  const greeting = document.querySelector("[data-greeting]");
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport)
    viewport.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
    );
  const savedUsername = window.localStorage.getItem("htciUsername");
  const currentPage = window.location.pathname.split("/").pop();
  const protectedPages = ["dashboard.html", "devices.html", "profile.html"];
  const displayUsername = savedUsername || "User";
  const displayInitials = displayUsername.slice(0, 2).toUpperCase();
  const firebaseDatabaseUrl =
    "https://htci-2ab87-default-rtdb.asia-southeast1.firebasedatabase.app";
  const monitoringFirebaseUrl = `${firebaseDatabaseUrl}/HTC_Incinerator/monitoring.json`;
  const resolveMonitoringUrl = (url) => {
    const value = String(url || "")
      .trim()
      .replace(/\/$/, "");
    return value.endsWith(".json")
      ? value
      : `${value}/HTC_Incinerator/monitoring.json`;
  };
  const resolveMonitoringPath = (url) => {
    const monitoringUrl = new URL(
      resolveMonitoringUrl(url),
      window.location.href,
    );
    return decodeURIComponent(monitoringUrl.pathname)
      .replace(/^\//, "")
      .replace(/\.json$/, "");
  };
  const sessionReady = (async () => {
    if (!protectedPages.includes(currentPage)) return null;
    const firebase = await import("./firebase-config.js?v=3");
    await firebase.auth.authStateReady();
    const user = firebase.auth.currentUser;
    if (!user) {
      window.location.replace("login.html");
      return null;
    }
    const [profile, token] = await Promise.all([
      firebase.get(firebase.ref(firebase.database, `users/${user.uid}`)).catch(error => {
        console.warn("Profil belum dapat dibaca:", error);
        return { val: () => null };
      }),
      user.getIdTokenResult(),
    ]);
    const isAdmin = token.claims.admin === true || profile.val()?.role === "admin";
    document.querySelectorAll(".user-mini small").forEach(label => {
      label.textContent = isAdmin ? "Administrator" : "User";
    });
    document.querySelectorAll("[data-admin-only]").forEach(element => {
      element.hidden = !isAdmin;
    });
    document.querySelectorAll(".device-list .edit, .device-list .delete").forEach(button => {
      button.hidden = !isAdmin;
    });
    return { firebase, user, isAdmin };
  })().catch(error => {
    console.error("Peran pengguna gagal dimuat:", error);
    return null;
  });
  const requireAdmin = async () => {
    const session = await sessionReady;
    if (!session?.isAdmin) throw new Error("Hanya admin yang dapat mengelola alat.");
    return session;
  };
  const loadUserApiLinks = async () => {
    const session = await sessionReady;
    if (!session) throw new Error("Silakan login kembali.");
    const { firebase, user } = session;
    const links = await firebase.get(firebase.ref(firebase.database, `users/${user.uid}/api`));
    if (links.exists()) return links.val();
    return (await firebase.get(firebase.ref(firebase.database, "deviceLinks"))).val();
  };
  const dateLabel = Array.from(
    document.querySelectorAll(".heading > div > small"),
  ).find((label) => label.textContent.includes("09:41 WIB"));
  const updateWibClock = () => {
    if (!dateLabel) return;
    const parts = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .reduce((values, part) => {
        values[part.type] = part.value;
        return values;
      }, {});
    dateLabel.textContent = `${parts.weekday.toUpperCase()}, ${parts.day} ${parts.month.toUpperCase()} ${parts.year} • ${parts.hour}:${parts.minute} WIB`;
  };
  updateWibClock();
  window.setInterval(updateWibClock, 30000);
  const greetingAccent = greeting?.querySelector("em");
  const updateGreeting = () => {
    if (!greeting) return;
    const hour = Number(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()));
    const period = hour >= 5 && hour < 11 ? "pagi"
      : hour >= 11 && hour < 15 ? "siang"
      : hour >= 15 && hour < 18 ? "sore" : "malam";
    greeting.textContent = savedUsername
      ? `Selamat ${period}, ${savedUsername} `
      : `Selamat ${period} `;
    if (greetingAccent) greeting.appendChild(greetingAccent);
  };
  updateGreeting();
  window.setInterval(updateGreeting, 30000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateGreeting();
  });
  document.querySelectorAll(".user-mini").forEach((userMini) => {
    const avatar = userMini.querySelector(":scope > b");
    const userLabel = userMini.querySelector(":scope > span");
    if (avatar) avatar.textContent = displayInitials;
    if (userLabel) {
      const role = userLabel.querySelector("small");
      userLabel.textContent = displayUsername;
      if (role) {
        role.textContent = savedUsername ? "User" : "Guest";
        userLabel.appendChild(role);
      }
    }
  });
  if (savedUsername) {
    const profileName = document.querySelector(
      ".profile > article:first-child h2",
    );
    if (profileName) profileName.textContent = savedUsername;
    const profileDetails = document.querySelector(
      ".profile > article:first-child p",
    );
    if (profileDetails)
      profileDetails.textContent = `User · ${savedUsername === "test" ? "test@htci.com" : `${savedUsername}@htci.local`}`;
  }
  document.querySelectorAll(".user-mini").forEach((userMini) => {
    const sidebarFoot = userMini.parentElement;
    userMini
      .querySelectorAll("button:not(.sidebar-logout)")
      .forEach((button) => button.remove());
    if (sidebarFoot && !sidebarFoot.querySelector(".sidebar-logout")) {
      const logoutButton = document.createElement("button");
      logoutButton.className = "sidebar-logout";
      logoutButton.dataset.action = "logout";
      logoutButton.textContent = "Keluar";
      sidebarFoot.appendChild(logoutButton);
    }
  });
  document.querySelectorAll("header .live").forEach((liveStatus) => {
    const profileLink = document.createElement("a");
    profileLink.className = "user-profile";
    profileLink.href = "profile.html";
    profileLink.title = "Buka profil";
    profileLink.setAttribute("aria-label", "Buka profil");
    profileLink.innerHTML =
      '<span class="user-icon" aria-hidden="true"></span>';
    liveStatus.replaceWith(profileLink);
  });

  const monitoringDevices = document.querySelector(".devices");
  if (monitoringDevices) {
    document.querySelector(".bottom")?.remove();
    document.querySelector(".summary")?.remove();
    const mainDescription = document.querySelector(".heading p");
    if (mainDescription) mainDescription.remove();
    const sectionTitle = monitoringDevices.previousElementSibling;
    const sectionHeading = sectionTitle?.querySelector("h2");
    if (sectionHeading) sectionHeading.textContent = "Monitoring alat";

    const filterBar = document.createElement("div");
    filterBar.className = "monitoring-toolbar";
    filterBar.innerHTML =
      '<label class="monitoring-search">⌕ <input type="search" placeholder="Cari nama alat..."></label><label class="monitoring-filter">Urutkan <select><option value="newest">Terbaru ditambahkan</option><option value="oldest">Terlama ditambahkan</option><option value="name-asc">Nama A-Z</option><option value="name-desc">Nama Z-A</option></select></label>';
    monitoringDevices.parentElement.insertBefore(filterBar, monitoringDevices);

    const deviceCards = Array.from(
      monitoringDevices.querySelectorAll(".device"),
    );
    if (deviceCards.length) {
      const fourthCard = deviceCards[deviceCards.length - 1].cloneNode(true);
      monitoringDevices.appendChild(fourthCard);
    }
    monitoringDevices.innerHTML = "";

    const searchInput = filterBar.querySelector("input");
    const sortSelect = filterBar.querySelector("select");
    const applyDeviceFilter = () => {
      const query = searchInput.value.trim().toLowerCase();
      const sortedCards = Array.from(
        monitoringDevices.querySelectorAll(".device"),
      ).sort((first, second) => {
        if (sortSelect.value === "name-asc")
          return first.dataset.name.localeCompare(second.dataset.name);
        if (sortSelect.value === "name-desc")
          return second.dataset.name.localeCompare(first.dataset.name);
        const direction = sortSelect.value === "oldest" ? 1 : -1;
        return (
          direction *
          (new Date(first.dataset.added) - new Date(second.dataset.added))
        );
      });
      sortedCards.forEach((card) => monitoringDevices.appendChild(card));
      sortedCards.forEach((card) => {
        card.hidden = !card.dataset.name.toLowerCase().includes(query);
      });
    };
    searchInput.addEventListener("input", applyDeviceFilter);
    sortSelect.addEventListener("change", applyDeviceFilter);

    monitoringDevices.innerHTML =
      '<div class="monitoring-empty">Mengambil data sensor dari Firebase...</div>';
    loadUserApiLinks()
      .then(async (deviceLinks) => {
        const firstDevice = deviceLinks && Object.values(deviceLinks)[0];
        if (!firstDevice?.url) {
          monitoringDevices.innerHTML =
            '<div class="monitoring-empty">Belum ada alat. Tambahkan link Firebase dari Kelola Alat.</div>';
          return null;
        }
        const firebase = await import("./firebase-config.js?v=3");
        const monitoringRef = firebase.ref(
          firebase.database,
          resolveMonitoringPath(firstDevice.url),
        );
        firebase.onValue(monitoringRef, (snapshot) => {
          const values = snapshot.val() || {};
          const number = (...keys) => {
            const value = keys
              .map((key) => values[key])
              .find(
                (candidate) =>
                  candidate !== undefined &&
                  candidate !== null &&
                  candidate !== "",
              );
            const parsed = Number(value);
            return value === undefined || !Number.isFinite(parsed) ? null : parsed;
          };
          const temperature = number(
            "temperature",
            "temperature_c",
            "temp_c",
            "suhu",
            "suhu_c",
          );
          const pm25 = number("pm2_5", "pm25", "pm_2_5");
          const ch4 = number("ch4_ppm", "ch4", "methane_ppm");
          const gasQuality = number("gas_quality_index", "gas_quality");
          const mq135 = number("mq135_voltage", "mq135");
          const mq4 = number("mq4_voltage", "mq4");
          const hasSensorData = [
            temperature,
            pm25,
            ch4,
            gasQuality,
            mq135,
            mq4,
          ].some((value) => value !== null && !Number.isNaN(value));
          if (!hasSensorData) {
            monitoringDevices.innerHTML =
              '<div class="monitoring-empty">Belum ada data sensor di Firebase.</div>';
            return;
          }
          const deviceName = firstDevice.name || "Perangkat Firebase";
          monitoringDevices.innerHTML = `<article class="device"><h3></h3><div class="temp">SUHU<strong>${temperature ?? "-"}<small>°C</small></strong><b>Gas buang</b></div><div class="sensors"><div><span class="sensor-label">Partikel debu halus</span><strong>${pm25 ?? "-"} <small>µg/m³</small></strong></div><div><span class="sensor-label">Kadar gas metana</span><strong>${ch4 ?? "-"} <small>ppm</small></strong></div><div><span class="sensor-label">Indikator kualitas udara</span><strong>${mq135 ?? "-"} <small>V</small></strong></div><div><span class="sensor-label">Indikator gas metana</span><strong>${mq4 ?? "-"} <small>V</small></strong></div></div><footer>Kualitas Gas <b>${gasQuality ?? "-"}/100</b><div class="bar"><i style="width:${Math.max(0, Math.min(100, gasQuality ?? 0))}%"></i></div></footer></article>`;
          const deviceCard = monitoringDevices.querySelector(".device");
          deviceCard.querySelector("h3").textContent = deviceName;
          deviceCard.dataset.name = deviceName;
          deviceCard.dataset.added = new Date().toISOString();
          applyDeviceFilter();
        }, (error) => {
          console.error("Data monitoring Firebase gagal dimuat:", error);
          monitoringDevices.innerHTML =
            '<div class="monitoring-empty">Data Firebase tidak dapat dimuat. Periksa koneksi dan security rules.</div>';
        });
      })
      .catch((error) => {
        console.error("Data monitoring Firebase gagal dimuat:", error);
        monitoringDevices.innerHTML =
          '<div class="monitoring-empty">Data Firebase tidak dapat dimuat. Periksa koneksi dan security rules.</div>';
      });
  }
  document
    .querySelectorAll(".device-list > div")
    .forEach((deviceRow, index) => {
      const deviceName = deviceRow.querySelector("b");
      const deviceId = deviceRow.querySelector("small");
      if (deviceName) deviceName.textContent = `Alat ${index + 1}`;
      if (deviceId)
        deviceId.textContent = monitoringFirebaseUrl;
    });
  const managedDeviceList = document.querySelector(".device-list");
  const managedDeviceSearch = document.querySelector(".toolbar input");
  if (managedDeviceList && managedDeviceSearch) {
    managedDeviceSearch.addEventListener("input", () => {
      const query = managedDeviceSearch.value.trim().toLowerCase();
      managedDeviceList
        .querySelectorAll(":scope > div")
        .forEach((deviceRow) => {
          deviceRow.hidden = !deviceRow.textContent
            .toLowerCase()
            .includes(query);
        });
    });
  }
  document.querySelectorAll(".brand").forEach((brand) => {
    const logo = document.createElement("img");
    logo.src = "img/sgllogo.png";
    logo.alt = "HTCI";
    logo.style.width = "52px";
    logo.style.height = "52px";
    logo.style.objectFit = "contain";
    logo.style.display = "block";
    const brandText = document.createElement("span");
    brandText.textContent = "HTCI";
    brand.textContent = "";
    brand.appendChild(logo);
    brand.appendChild(brandText);
  });

  document.querySelectorAll(".sidebar").forEach((sidebar) => {
    const workspaceLabel = sidebar.querySelector(".workspace-label");
    if (!workspaceLabel || sidebar.querySelector(".sidebar-toggle")) return;
    const toggleButton = document.createElement("button");
    toggleButton.className = "sidebar-toggle";
    toggleButton.type = "button";
    toggleButton.setAttribute("aria-label", "Minimize navbar");
    toggleButton.innerHTML = '<span aria-hidden="true">‹</span><b>Minimize</b>';
    workspaceLabel.before(toggleButton);
    const isMobile = window.matchMedia("(max-width: 720px)").matches;
    const collapsed =
      isMobile || window.localStorage.getItem("htciSidebar") === "collapsed";
    sidebar.classList.toggle("collapsed", collapsed);
    toggleButton.setAttribute(
      "aria-label",
      collapsed ? "Maximize navbar" : "Minimize navbar",
    );
    toggleButton.querySelector("b").textContent = collapsed
      ? "Maximize"
      : "Minimize";
    toggleButton.querySelector("span").textContent = collapsed ? "›" : "‹";
    toggleButton.addEventListener("click", () => {
      const isCollapsed = sidebar.classList.toggle("collapsed");
      window.localStorage.setItem(
        "htciSidebar",
        isCollapsed ? "collapsed" : "expanded",
      );
      toggleButton.setAttribute(
        "aria-label",
        isCollapsed ? "Maximize navbar" : "Minimize navbar",
      );
      toggleButton.querySelector("b").textContent = isCollapsed
        ? "Maximize"
        : "Minimize";
      toggleButton.querySelector("span").textContent = isCollapsed ? "›" : "‹";
    });
    if (isMobile) {
      const mobileMenuButton = document.createElement("button");
      mobileMenuButton.className = "mobile-menu-toggle";
      mobileMenuButton.type = "button";
      mobileMenuButton.setAttribute("aria-label", "Buka menu navigasi");
      mobileMenuButton.innerHTML = '<span aria-hidden="true">☰</span>';
      document.body.appendChild(mobileMenuButton);
      const updateMobileMenu = () => {
        const isOpen = !sidebar.classList.contains("collapsed");
        sidebar.style.setProperty(
          "transform",
          isOpen ? "translateX(0)" : "translateX(-105%)",
          "important",
        );
        mobileMenuButton.setAttribute(
          "aria-label",
          isOpen ? "Tutup menu navigasi" : "Buka menu navigasi",
        );
        mobileMenuButton.querySelector("span").textContent = isOpen
          ? "×"
          : "☰";
      };
      mobileMenuButton.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        updateMobileMenu();
      });
      sidebar.querySelectorAll(".nav-item").forEach((item) =>
        item.addEventListener("click", () => {
          sidebar.classList.add("collapsed");
          updateMobileMenu();
        }),
      );
      updateMobileMenu();
    }
  });

  if (authSwitch) {
    authSwitch.firstChild.textContent = "Belum punya akun? ";
  }

  const authHeading = document.querySelector(".auth-form-wrap h2");
  if (authHeading) {
    authHeading.textContent = "Di Monitoring Pembakaran";
    authHeading.style.fontSize = "32px";
  }

  const formDescription = document.querySelector(".form-description");
  if (formDescription && document.querySelector('[data-auth-form="login"]')) {
    const testAccount = document.createElement("div");
    testAccount.className = "test-credentials";
    testAccount.innerHTML =
      "<strong>Akun testing</strong><span>Username: <b>test</b></span><span>Password: <b>123456</b></span>";
    testAccount.style.display = "grid";
    testAccount.style.gridTemplateColumns = "1fr 1fr";
    testAccount.style.gap = "6px 12px";
    testAccount.style.margin = "16px 0 20px";
    testAccount.style.padding = "12px 14px";
    testAccount.style.border = "1px solid #cfe6d9";
    testAccount.style.borderRadius = "8px";
    testAccount.style.background = "#eef8f1";
    testAccount.style.color = "#5d7066";
    testAccount.style.fontSize = "11px";
    testAccount.querySelector("strong").style.gridColumn = "1 / -1";
    testAccount.querySelector("strong").style.color = "#23896e";
    formDescription.insertAdjacentElement("afterend", testAccount);
  }

  const loginForm = document.querySelector('[data-auth-form="login"]');
  if (loginForm) {
    const usernameLabel = loginForm.querySelector('label[for="email"]');
    const emailInput = loginForm.querySelector("#email");
    if (usernameLabel && emailInput) {
      usernameLabel.textContent = "Username atau email";
      usernameLabel.htmlFor = "username";
      emailInput.id = "username";
      emailInput.name = "username";
      emailInput.type = "text";
      emailInput.placeholder = "Masukkan username atau email terdaftar";
      emailInput.autocomplete = "username";
    }
  }

  if (introCopy && document.body.classList.contains("auth-page")) {
    const layoutStyle = document.createElement("style");
    layoutStyle.textContent = `
            .auth-intro { position: relative; }
            .auth-intro .intro-copy {
                position: absolute;
                top: 122px;
                left: 9vw;
                right: 9vw;
                transform: none !important;
            }
            @media (max-width: 720px) {
                .auth-intro .intro-copy {
                    top: 102px;
                    left: 25px;
                    right: 25px;
                }
            }
        `;
    document.head.appendChild(layoutStyle);
    const introHeading = introCopy.querySelector("h1");
    if (introHeading) {
      introHeading.innerHTML =
        "Monitoring data pembakaran<br><em>lebih terkendali.</em>";
    }
  }

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2400);
  };

  document.querySelectorAll("[data-auth-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const isLogin = form.dataset.authForm !== "register";
      const identifier = isLogin
        ? form.querySelector('input[name="username"]').value.trim()
        : form.querySelector('input[type="email"]').value.trim();
      const username = isLogin
        ? identifier.split("@")[0]
        : form.querySelector("#name").value.trim();
      const email = identifier.includes("@")
        ? identifier
        : identifier.toLowerCase() === "test"
          ? "test@htci.com"
          : `${identifier.toLowerCase()}@htci.local`;
      const password = form.querySelector('input[type="password"]').value;
      const authPassword = password;
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      try {
        const firebase = await import("./firebase-config.js?v=3");
        const {
          auth,
          createUserWithEmailAndPassword,
          signInWithEmailAndPassword,
        } = firebase;
        if (!isLogin) {
          const credential = await createUserWithEmailAndPassword(auth, email, authPassword);
          window.localStorage.setItem("htciUsername", username || email.split("@")[0]);
          try {
            await saveLogin(firebase, credential.user, username || email.split("@")[0]);
          } catch (error) {
            console.warn("Akun berhasil dibuat, tetapi profil belum tersimpan:", error);
          }
          showToast("Akun berhasil dibuat");
        } else {
          const userCredential = await signInWithEmailAndPassword(auth, email, authPassword);
          try {
            await saveLogin(firebase, userCredential.user, username);
          } catch (error) {
            console.warn(
              "Login berhasil, tetapi riwayat login tidak tersimpan:",
              error,
            );
          }
          window.localStorage.setItem("htciUsername", username);
          showToast("Berhasil masuk ke workspace");
        }
        window.setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 500);
      } catch (error) {
        console.error("Login Firebase gagal:", error);
        showToast(getFirebaseMessage(error.code));
        submitButton.disabled = false;
      }
    });
  });

  document.querySelectorAll("[data-page-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = link.dataset.pageLink;
      if (target === window.location.pathname.split("/").pop())
        event.preventDefault();
    });
  });

  document.querySelectorAll('[data-action="logout"]').forEach((button) => {
    button.addEventListener("click", () => {
      const logoutModal = document.createElement("div");
      logoutModal.className = "modal logout-modal";
      logoutModal.innerHTML =
        '<div><small>KELUAR DARI AKUN</small><h2>Yakin ingin keluar?</h2><p>Sesi login kamu akan diakhiri.</p><div class="modal-actions"><button class="outline" type="button">Tidak</button><button class="primary" type="button">Ya, keluar</button></div></div>';
      document.body.appendChild(logoutModal);
      logoutModal.classList.add("show");
      const closeModal = () => logoutModal.remove();
      logoutModal
        .querySelector(".outline")
        .addEventListener("click", closeModal);
      logoutModal.addEventListener("click", (event) => {
        if (event.target === logoutModal) closeModal();
      });
      logoutModal
        .querySelector(".primary")
        .addEventListener("click", async () => {
          const { auth, signOut } = await import("./firebase-config.js?v=3");
          await signOut(auth);
          window.localStorage.removeItem("htciUsername");
          window.location.href = "index.html";
        });
    });
  });

  const languageSelect = document.querySelector(".settings select");
  const themeButtons = document.querySelectorAll(".settings .theme");
  const savedLanguage =
    window.localStorage.getItem("htciLanguage") || "Bahasa Indonesia";
  const savedTheme = window.localStorage.getItem("htciTheme") || "light";
  const applyLanguage = (language) => {
    const english = language === "English";
    document.documentElement.lang = english ? "en" : "id";
    const translations = english
      ? {
          label: "Workspace settings",
          title: "Profile & settings",
          description: "Manage your account and monitoring preferences.",
          preferences: "Preferences",
          language: "Application language",
          languageHint: "Choose the language used in the dashboard",
          theme: "Appearance theme",
          themeHint: "Adjust the appearance for your comfort",
          notifications: "Warning notifications",
          notificationsHint: "Get notified when a sensor exceeds its limit",
          logout: "Sign out of account",
        }
      : {
          label: "PENGATURAN WORKSPACE",
          title: "Profil & pengaturan",
          description: "Atur akun dan preferensi pengalaman monitoring Anda.",
          preferences: "Preferensi",
          language: "Bahasa aplikasi",
          languageHint: "Pilih bahasa yang digunakan di dashboard",
          theme: "Tema tampilan",
          themeHint: "Sesuaikan tampilan untuk kenyamanan Anda",
          notifications: "Notifikasi peringatan",
          notificationsHint: "Dapatkan notifikasi saat sensor melewati batas",
          logout: "Keluar dari akun",
        };
    const headingSmall = document.querySelector(".heading > div > small");
    const heading = document.querySelector(".heading h1");
    const headingDescription = document.querySelector(".heading p");
    const settingsHeading = document.querySelector(".settings h2");
    const settingBlocks = document.querySelectorAll(".settings > div");
    if (headingSmall) headingSmall.textContent = translations.label;
    if (heading) heading.textContent = translations.title;
    if (headingDescription)
      headingDescription.textContent = translations.description;
    if (settingsHeading) settingsHeading.textContent = translations.preferences;
    if (settingBlocks[0]) {
      settingBlocks[0].querySelector("b").textContent = translations.language;
      settingBlocks[0].querySelector("small").textContent =
        translations.languageHint;
    }
    if (settingBlocks[1]) {
      settingBlocks[1].querySelector("b").textContent = translations.theme;
      settingBlocks[1].querySelector("small").textContent =
        translations.themeHint;
    }
    if (settingBlocks[2]) {
      settingBlocks[2].querySelector("b").textContent =
        translations.notifications;
      settingBlocks[2].querySelector("small").textContent =
        translations.notificationsHint;
    }
    const logoutLink = document.querySelector(".danger");
    if (logoutLink) logoutLink.textContent = `↪ ${translations.logout}`;
  };
  if (languageSelect) {
    languageSelect.value = savedLanguage;
    languageSelect.addEventListener("change", () => {
      window.localStorage.setItem("htciLanguage", languageSelect.value);
      applyLanguage(languageSelect.value);
    });
    applyLanguage(savedLanguage);
  }
  document.body.classList.toggle("dark-theme", savedTheme === "dark");
  themeButtons.forEach((button, index) => {
    button.classList.toggle(
      "active",
      savedTheme === (index === 0 ? "light" : "dark"),
    );
    button.addEventListener("click", () => {
      const theme = index === 0 ? "light" : "dark";
      window.localStorage.setItem("htciTheme", theme);
      document.body.classList.toggle("dark-theme", theme === "dark");
      themeButtons.forEach((themeButton, themeIndex) =>
        themeButton.classList.toggle("active", themeIndex === index),
      );
    });
  });

  const saveDeviceLink = async (deviceName, firebaseApi, existingKey = null) => {
    const { firebase, user } = await requireAdmin();
    const deviceKey = existingKey || firebase.push(firebase.ref(firebase.database, "deviceLinks")).key;
    const deviceData = {
      name: deviceName,
      url: firebaseApi,
      updatedAt: firebase.serverTimestamp(),
      updatedBy: user.uid,
    };
    await firebase.update(firebase.ref(firebase.database), {
      [`users/${user.uid}/api/${deviceKey}`]: deviceData,
      [`deviceLinks/${deviceKey}`]: deviceData,
    });
    return deviceKey;
  };
  const loadDeviceLinks = loadUserApiLinks;

  const addDeviceButton = document.querySelector(
    '[data-message="Form tambah alat dibuka"]',
  );
  const deviceList = document.querySelector(".device-list");
  if (addDeviceButton && deviceList) {
    const deviceModal = document.createElement("div");
    deviceModal.className = "modal device-modal";
    deviceModal.innerHTML = `<div><button class="close" type="button" aria-label="Tutup">×</button><small>PERANGKAT IOT</small><h2>Tambah alat</h2><p>Masukkan data alat yang ingin dipantau.</p><form><label>Nama alat<input name="deviceName" placeholder="Contoh: Alat 5" required></label><label>Link/API key Firebase<input name="firebaseApi" value="${monitoringFirebaseUrl}" required></label><button class="primary full" type="submit">Simpan alat</button></form></div>`;
    document.body.appendChild(deviceModal);
    const closeDeviceModal = () => deviceModal.classList.remove("show");
    addDeviceButton.addEventListener("click", async () => {
      try { await requireAdmin(); deviceModal.classList.add("show"); }
      catch (error) { showToast(error.message); }
    });
    deviceModal
      .querySelector(".close")
      .addEventListener("click", closeDeviceModal);
    deviceModal.addEventListener("click", (event) => {
      if (event.target === deviceModal) closeDeviceModal();
    });
    deviceModal
      .querySelector("form")
      .addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const newRow = document.createElement("div");
        const deviceName = String(formData.get("deviceName")).trim();
        const firebaseApi = String(formData.get("firebaseApi")).trim();
        try {
          newRow.dataset.key = await saveDeviceLink(deviceName, firebaseApi);
        } catch (error) {
          console.error("Link perangkat gagal disimpan ke Firebase:", error);
          showToast("Link gagal disimpan ke Firebase");
          return;
        }
        newRow.innerHTML = `<b></b><small></small><button class="edit" type="button">Edit</button><button class="delete" type="button">Hapus</button>`;
        newRow.querySelector("b").textContent = deviceName;
        newRow.querySelector("small").textContent = firebaseApi;
        newRow.dataset.api = formData.get("firebaseApi");
        deviceList.appendChild(newRow);
        closeDeviceModal();
        showToast(`${formData.get("deviceName")} berhasil ditambahkan`);
      });
  }

  if (deviceList) {
    deviceList
      .querySelectorAll(".edit")
      .forEach((button) => button.removeAttribute("data-action"));
    deviceList
      .querySelectorAll(".delete")
      .forEach((button) => button.removeAttribute("data-action"));
    const editModal = document.createElement("div");
    editModal.className = "modal device-modal";
    editModal.innerHTML = `<div><button class="close" type="button" aria-label="Tutup">×</button><small>PERANGKAT IOT</small><h2>Edit alat</h2><p>Perbarui nama dan link/API key Firebase.</p><form><label>Nama alat<input name="deviceName" required></label><label>Link/API key Firebase<input name="firebaseApi" required></label><button class="primary full" type="submit">Simpan perubahan</button></form></div>`;
    document.body.appendChild(editModal);
    let selectedDevice = null;
    const closeEditModal = () => editModal.classList.remove("show");
    editModal.querySelector(".close").addEventListener("click", closeEditModal);
    editModal.addEventListener("click", (event) => {
      if (event.target === editModal) closeEditModal();
    });
    deviceList.addEventListener("click", (event) => {
      const editButton = event.target.closest(".edit");
      if (!editButton || editButton.hidden) return;
      selectedDevice = editButton.parentElement;
      const currentName = selectedDevice.querySelector("b")?.textContent || "";
      const currentDetails =
        selectedDevice.querySelector("small")?.textContent || "";
      editModal.querySelector('[name="deviceName"]').value = currentName;
      editModal.querySelector('[name="firebaseApi"]').value =
        currentDetails.split(" · ●")[0];
      editModal.classList.add("show");
    });
    editModal
      .querySelector("form")
      .addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!selectedDevice) return;
        const formData = new FormData(event.currentTarget);
        const deviceName = String(formData.get("deviceName")).trim();
        const firebaseApi = String(formData.get("firebaseApi")).trim();
        try {
          await saveDeviceLink(deviceName, firebaseApi, selectedDevice.dataset.key);
        } catch (error) {
          console.error("Link perangkat gagal diperbarui di Firebase:", error);
          showToast("Link gagal diperbarui di Firebase");
          return;
        }
        selectedDevice.querySelector("b").textContent = deviceName;
        selectedDevice.querySelector("small").textContent =
          firebaseApi;
        closeEditModal();
        showToast("Data alat berhasil diperbarui");
      });

    const deleteModal = document.createElement("div");
    deleteModal.className = "modal device-modal";
    deleteModal.innerHTML =
      '<div><small>HAPUS PERANGKAT</small><h2>Hapus alat?</h2><p class="delete-confirmation">Data alat ini akan dihapus dari daftar.</p><div class="modal-actions"><button class="outline" type="button">Tidak</button><button class="primary" type="button">Ya, hapus</button></div></div>';
    document.body.appendChild(deleteModal);
    let selectedDeleteDevice = null;
    const closeDeleteModal = () => deleteModal.classList.remove("show");
    deleteModal
      .querySelector(".outline")
      .addEventListener("click", closeDeleteModal);
    deleteModal.addEventListener("click", (event) => {
      if (event.target === deleteModal) closeDeleteModal();
    });
    deviceList.addEventListener("click", (event) => {
      const deleteButton = event.target.closest(".delete");
      if (!deleteButton || deleteButton.hidden) return;
      selectedDeleteDevice = deleteButton.parentElement;
      const deviceName =
        selectedDeleteDevice.querySelector("b")?.textContent || "alat ini";
      deleteModal.querySelector(".delete-confirmation").textContent =
        `Yakin ingin menghapus ${deviceName}?`;
      deleteModal.classList.add("show");
    });
    deleteModal.querySelector(".primary").addEventListener("click", async () => {
      if (!selectedDeleteDevice) return;
      try {
        const { firebase, user } = await requireAdmin();
        const key = selectedDeleteDevice.dataset.key;
        if (!key) throw new Error("ID alat tidak ditemukan.");
        await firebase.update(firebase.ref(firebase.database), {
          [`users/${user.uid}/api/${key}`]: null,
          [`deviceLinks/${key}`]: null,
        });
        selectedDeleteDevice.remove();
      } catch (error) {
        showToast(error.message);
        return;
      }
      selectedDeleteDevice = null;
      closeDeleteModal();
      showToast("Alat berhasil dihapus");
    });
  }

  if (deviceList) {
    deviceList.innerHTML =
      '<div class="device-list-empty">Memuat alat dari Firebase...</div>';
    loadDeviceLinks()
      .then(async (deviceLinks) => {
        const session = await sessionReady;
        deviceList.innerHTML = "";
        const entries = deviceLinks ? Object.entries(deviceLinks) : [];
        if (!entries.length) {
          deviceList.innerHTML =
            '<div class="device-list-empty">Belum ada alat. Tambahkan link Firebase terlebih dahulu.</div>';
          return;
        }
        entries.forEach(([key, device]) => {
          const row = document.createElement("div");
          row.dataset.key = key;
          row.innerHTML = `<b></b><small></small><button class="edit" type="button">Edit</button><button class="delete" type="button">Hapus</button>`;
          row.querySelector("b").textContent = device.name || key;
          row.querySelector("small").textContent =
            device.url || "";
          row.querySelectorAll("button").forEach(button => { button.hidden = !session?.isAdmin; });
          deviceList.appendChild(row);
        });
      })
      .catch((error) => {
        console.error("Daftar alat Firebase gagal dimuat:", error);
        deviceList.innerHTML =
          '<div class="device-list-empty">Daftar alat Firebase tidak dapat dimuat.</div>';
      });
  }

  document.querySelectorAll('[data-action="toast"]').forEach((button) => {
    button.addEventListener("click", () =>
      showToast(button.dataset.message || "Perubahan berhasil disimpan"),
    );
  });

  document.querySelectorAll(".help-card button").forEach((button) => {
    button.addEventListener("click", () =>
      window.open("https://wa.me/+62895360799127", "_blank", "noopener"),
    );
  });

  function getFirebaseMessage(code) {
    if (!code) {
      return "Firebase belum terhubung. Jalankan aplikasi melalui server lokal.";
    }
    const messages = {
      "auth/invalid-credential": "Akun atau kata sandi salah. Jika mendaftar dengan email, masukkan email lengkap.",
      "auth/user-not-found": "Akun belum terdaftar. Gunakan email lengkap yang dipakai saat daftar.",
      "auth/wrong-password": "Kata sandi salah.",
      "auth/email-already-in-use": "Email tersebut sudah terdaftar.",
      "auth/invalid-email": "Format email tidak valid.",
      "auth/weak-password": "Kata sandi minimal 6 karakter.",
      "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
      "auth/operation-not-allowed": "Login email belum diaktifkan di Firebase.",
      "auth/unauthorized-domain": "Domain situs belum diizinkan di Firebase Authentication.",
      "auth/network-request-failed":
        "Firebase tidak dapat dijangkau. Cek koneksi internet atau pemblokir jaringan.",
      "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
        "API key Firebase tidak valid.",
      "auth/app-not-authorized": "Aplikasi ini belum diizinkan oleh Firebase.",
    };
    return (
      messages[code] || "Terjadi kesalahan. Periksa koneksi dan coba lagi."
    );
  }

  async function saveLogin(firebase, user, username) {
    const loginData = {
      username,
      uid: user.uid,
      lastLogin: firebase.serverTimestamp(),
    };
    await firebase.update(
      firebase.ref(firebase.database, `users/${user.uid}`),
      loginData,
    );
    await firebase.set(
      firebase.push(
        firebase.ref(firebase.database, `loginHistory/${user.uid}`),
      ),
      loginData,
    );
  }
});
