import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    sendPasswordResetEmail,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// =================================================
// UI NAVIGATION & SWITCH MODE (Chạy ngay lập tức)
// =================================================
const container = document.getElementById("auth");

function switchMode() {
    const authContainer = container || document.getElementById("auth");
    if (authContainer) {
        authContainer.classList.toggle("register-mode");
    }
    const loginMsg = document.getElementById("loginMessage");
    if (loginMsg) loginMsg.textContent = "";
    const registerMsg = document.getElementById("registerMessage");
    if (registerMsg) registerMsg.textContent = "";
}

window.switchMode = switchMode;

// =================================================
// COOKIE HELPERS
// =================================================
function setCookie(name, value, days = 7) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=');
        return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, "");
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

function parseJwt(token) {
    try {
        const parts = String(token || "").split(".");
        if (parts.length !== 3) return null;
        let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) base64 += "=";
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return JSON.parse(new TextDecoder("utf-8").decode(bytes));
    } catch (e) {
        return null;
    }
}

window.setCookie = setCookie;
window.getCookie = getCookie;
window.deleteCookie = deleteCookie;

// =================================================
// FIREBASE INITIALIZATION (Không block UI)
// =================================================
let authInstance = null;
let firebasePromise = null;

async function getAuthInstance() {
    if (authInstance) return authInstance;
    if (!firebasePromise) {
        firebasePromise = fetch("http://127.0.0.1:8000/firebase")
            .then(async (res) => {
                if (!res.ok) throw new Error("Không thể tải cấu hình Firebase từ máy chủ");
                const firebaseConfig = await res.json();
                const app = initializeApp(firebaseConfig);
                authInstance = getAuth(app);
                return authInstance;
            })
            .catch((err) => {
                firebasePromise = null;
                throw err;
            });
    }
    return await firebasePromise;
}

// Bắt đầu nạp Firebase ngầm
getAuthInstance().catch(err => console.warn("Đang chờ backend sẵn sàng:", err.message));


document.querySelectorAll(".toggle-password").forEach(button => {
    button.addEventListener("click", function () {
        const input = this.parentElement.querySelector("input");
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";

        const eyeOpen = this.querySelector(".eye-open");
        const eyeClosed = this.querySelector(".eye-closed");

        if (isPassword) {
            eyeOpen.style.display = "none";
            eyeClosed.style.display = "inline";
        } else {
            eyeOpen.style.display = "inline";
            eyeClosed.style.display = "none";
        }
    });
});

// =================================================
// CUSTOM FORGOT PASSWORD POPUP LOGIC
// =================================================
const forgotModal = document.getElementById("forgotModal");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const closeForgotModal = document.getElementById("closeForgotModal");
const cancelForgotModal = document.getElementById("cancelForgotModal");
const forgotForm = document.getElementById("forgotForm");
const forgotEmailInput = document.getElementById("forgot_email");
const forgotMessage = document.getElementById("forgotMessage");
const submitForgotBtn = document.getElementById("submitForgotBtn");

function openForgotModal() {
    if (!forgotModal) return;
    const emailLoginVal = document.getElementById("email_login") ? document.getElementById("email_login").value.trim() : "";
    if (forgotEmailInput) {
        forgotEmailInput.value = emailLoginVal;
    }
    if (forgotMessage) {
        forgotMessage.textContent = "";
        forgotMessage.className = "modal-message";
    }
    forgotModal.classList.add("active");
    setTimeout(() => forgotEmailInput && forgotEmailInput.focus(), 150);
}

function closeForgotModalHandler() {
    if (!forgotModal) return;
    forgotModal.classList.remove("active");
    if (submitForgotBtn) {
        submitForgotBtn.disabled = false;
        submitForgotBtn.textContent = "Gửi liên kết";
    }
}

if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", openForgotModal);
}
if (closeForgotModal) {
    closeForgotModal.addEventListener("click", closeForgotModalHandler);
}
if (cancelForgotModal) {
    cancelForgotModal.addEventListener("click", closeForgotModalHandler);
}
if (forgotModal) {
    forgotModal.addEventListener("click", function (e) {
        if (e.target === forgotModal) {
            closeForgotModalHandler();
        }
    });
    window.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && forgotModal.classList.contains("active")) {
            closeForgotModalHandler();
        }
    });
}

if (forgotForm) {
    forgotForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = forgotEmailInput.value.trim();
        if (!email) {
            forgotMessage.className = "modal-message error";
            forgotMessage.textContent = "Vui lòng nhập địa chỉ email!";
            return;
        }

        submitForgotBtn.disabled = true;
        submitForgotBtn.textContent = "Đang gửi...";
        forgotMessage.className = "modal-message";
        forgotMessage.textContent = "";

        try {
            const auth = await getAuthInstance();
            await sendPasswordResetEmail(auth, email);
            forgotMessage.className = "modal-message success";
            forgotMessage.textContent = `Đã gửi liên kết đặt lại mật khẩu đến ${email}. Hãy kiểm tra hộp thư (hoặc mục Spam)!`;
            submitForgotBtn.textContent = "Đã gửi!";
            setTimeout(() => {
                closeForgotModalHandler();
            }, 3500);
        } catch (error) {
            console.error("Lỗi đặt lại mật khẩu:", error);
            submitForgotBtn.disabled = false;
            submitForgotBtn.textContent = "Gửi liên kết";
            forgotMessage.className = "modal-message error";
            if (error.code === "auth/user-not-found") {
                forgotMessage.textContent = "Email này chưa được đăng ký trong hệ thống!";
            } else if (error.code === "auth/invalid-email") {
                forgotMessage.textContent = "Địa chỉ email không hợp lệ!";
            } else if (error.code === "auth/too-many-requests") {
                forgotMessage.textContent = "Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau ít phút!";
            } else {
                forgotMessage.textContent = error.message || "Không thể gửi email. Vui lòng thử lại sau!";
            }
        }
    });
}

document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = this.querySelector("button[type='submit']");
    const email_login = document.getElementById("email_login").value.trim();
    const password_login = document.getElementById("password_login").value.trim();
    const login_message = document.getElementById("loginMessage");
    login_message.textContent = "";

    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang đăng nhập...";
    submitBtn.style.opacity = "0.7";
    submitBtn.style.cursor = "not-allowed";

    try {
        const auth = await getAuthInstance();
        const { user } = await signInWithEmailAndPassword(auth, email_login, password_login);

        if (!user.emailVerified) {
            try {
                await sendEmailVerification(user);
            } catch (err) {
                console.error("Lỗi gửi email xác thực:", err);
            }
            await signOut(auth);
            throw new Error("Email chưa được xác thực! Đã gửi lại email xác nhận đến hộp thư của bạn. Vui lòng kiểm tra và xác nhận trước khi đăng nhập.");
        }

        const firebaseIdToken = await user.getIdToken();
        const response = await fetch("http://127.0.0.1:8000/auth/login", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${firebaseIdToken}`
            }
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(typeof result.error === "string"
                ? result.error
                : (result.detail || "Không thể cấp access token"));
        }

        const accessToken = result.data.access_token;
        setCookie("access_token", accessToken, 7);

        const payload = parseJwt(accessToken) || {};
        const rawRoles = payload.role_id || payload.role || [2];
        const roleIds = (Array.isArray(rawRoles) ? rawRoles : [rawRoles]).map(Number);

        // Phân quyền điều hướng theo role_id:
        // 1: Admin, 2: Khách hàng, 3: Nhân viên cửa hàng, 4: Chủ cửa hàng
        let vrpRole = "customer";
        let targetPage = "index.html";
        if (roleIds.includes(1)) {
            vrpRole = "admin";
            targetPage = "store-dashboard.html";
        } else if (roleIds.includes(4) || roleIds.includes(3)) {
            vrpRole = "store";
            targetPage = "store-dashboard.html";
        }

        const displayName = payload.name || email_login.split("@")[0];
        setCookie("vrp_logged_in", "1", 7);
        setCookie("vrp_role", vrpRole, 7);
        setCookie("vrp_user_name", displayName, 7);
        try {
            localStorage.setItem("vrp_logged_in", "1");
            localStorage.setItem("vrp_role", vrpRole);
            localStorage.setItem("vrp_user_name", displayName);
            localStorage.setItem("vrp_user_email", payload.email || email_login);
        } catch (err) {}

        window.location.href = targetPage;
    } catch (error) {
        login_message.style.color = 'red';
        if (error.code?.startsWith("auth/")) {
            login_message.textContent = "Email hoặc mật khẩu không chính xác";
        } else {
            login_message.textContent = error.message || "Không thể đăng nhập";
        }
        document.getElementById("email_login").value = "";
        document.getElementById("password_login").value = "";
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
    }
});


document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = this.querySelector("button[type='submit']");
    const inputs = this.querySelectorAll("input");

    const name_register = inputs[0].value.trim();
    const email_register = inputs[1].value.trim();
    const password = inputs[2].value.trim();
    const confirmPassword = inputs[3].value.trim();

    const message = document.getElementById("registerMessage");
    message.textContent = "";

    if (password !== confirmPassword) {
        message.style.color = "#d33";
        message.textContent = "Mật khẩu xác nhận không khớp!";
        return;
    }

    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang xử lý...";
    submitBtn.style.opacity = "0.7";
    submitBtn.style.cursor = "not-allowed";

    try {
        const auth = await getAuthInstance();
        // 1. Tạo tài khoản trên Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email_register, confirmPassword);
        const user = userCredential.user;

        // 2. Chạy SONG SONG: gửi email xác thực và lưu vào cơ sở dữ liệu backend
        const sendEmailTask = sendEmailVerification(user).catch(err => {
            console.warn("Lỗi gửi email xác thực:", err);
        });

        const saveDbTask = fetch("http://127.0.0.1:8000/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fullname: name_register,
                email: email_register
            })
        }).then(async (res) => {
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Không thể lưu thông tin vào hệ thống");
            }
        });

        await Promise.all([sendEmailTask, saveDbTask]);

        // 3. Đăng xuất phiên tạm của Firebase (chạy nền, không đợi làm chậm UI)
        signOut(auth).catch(() => { });

        // 4. Hiển thị thông báo thành công
        Swal.fire({
            title: "Đăng ký thành công!",
            text: "Một email xác thực đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra email (cả thư rác/spam) và bấm vào liên kết để kích hoạt tài khoản trước khi đăng nhập.",
            icon: "success",
            confirmButtonText: "Đã hiểu"
        });

        inputs.forEach((input) => {
            input.value = "";
        });
        switchMode();
    } catch (error) {
        message.style.color = "#d33";
        if (error.code === "auth/email-already-in-use") {
            message.textContent = "Email này đã được sử dụng!";
        } else if (error.code === "auth/weak-password") {
            message.textContent = "Mật khẩu phải có tối thiểu 6 ký tự!";
        } else {
            message.textContent = error.message || "Đăng ký thất bại, vui lòng thử lại!";
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
    }
}); 