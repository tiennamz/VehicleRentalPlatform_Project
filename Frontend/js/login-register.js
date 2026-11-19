import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth,
    sendPasswordResetEmail,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification

    } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCKkSNAEypcF4KKmuCh4QfyMj8-5IrTagg",
    authDomain: "vehiclerentalflatform.firebaseapp.com",
    projectId: "vehiclerentalflatform",
    storageBucket: "vehiclerentalflatform.firebasestorage.app",
    messagingSenderId: "857032499308",
    appId: "1:857032499308:web:3dad3252e7b15cdec73849",
    measurementId: "G-2PVY3T7GJB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const container = document.getElementById("auth");

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

window.setCookie = setCookie;
window.getCookie = getCookie;
window.deleteCookie = deleteCookie;

function switchMode() {
    container.classList.toggle("register-mode");
    document.getElementById("loginMessage").textContent = "";
    document.getElementById("registerMessage").textContent = "";
}

window.switchMode = switchMode;


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

document.getElementById("loginForm").addEventListener("submit", function (e) {

        e.preventDefault();

        const email_login = document.getElementById("email_login").value.trim()
        const password_login = document.getElementById("password_login").value.trim()

        signInWithEmailAndPassword(auth, email_login, password_login)
            .then(async ({ user })=>{
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
                        : "Không thể cấp access token");
                }

                setCookie("access_token", result.data.access_token, 7);
                Swal.fire({
                    title: "Đăng nhập thành công!",
                    icon: "success",
                    timer: 2000,
                    draggable: true
                });
            })
            .catch((error)=>{
                const login_message = document.getElementById("loginMessage")
                login_message.style.color='red'
                if (error.code?.startsWith("auth/")) {
                    login_message.textContent = "Email hoặc mật khẩu không chính xác";
                } else {
                    login_message.textContent = error.message || "Không thể đăng nhập";
                }
                document.getElementById("email_login").value = "";
                document.getElementById("password_login").value = "";
            })
    })


    document.getElementById("registerForm").addEventListener("submit",  function (e) {

        e.preventDefault();

        const inputs = this.querySelectorAll("input");

        const name_register = inputs[0].value.trim()
        const email_register = inputs[1].value.trim()
        const password = inputs[2].value.trim();
        const confirmPassword = inputs[3].value.trim();

        const message = document.getElementById("registerMessage");

        if (password !== confirmPassword) {

            message.style.color = "#d33";
            message.textContent = "Mật khẩu xác nhận không khớp!";

            return;
        }

        createUserWithEmailAndPassword(auth, email_register, confirmPassword)
            .then(async (userCredential)=>{
                const user = userCredential.user;

                // Gửi email xác thực từ Firebase
                await sendEmailVerification(user);

                // Lưu user vào cơ sở dữ liệu backend
                await fetch("http://127.0.0.1:8000/auth/register", {
                    method: "POST",
                    headers:{
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        fullname: name_register,
                        email: email_register
                    })
                });

                // Đăng xuất tạm thời để user bấm link trong email xác thực
                await signOut(auth);

                Swal.fire({
                    title: "Đăng ký thành công!",
                    text: "Một email xác thực đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra email (cả thư rác/spam) và bấm vào liên kết để kích hoạt tài khoản trước khi đăng nhập.",
                    icon: "success",
                    confirmButtonText: "Đã hiểu"
                });

                document.querySelectorAll("input").forEach((input)=>{
                    input.value= ""
                });
                switchMode();
            })
            .catch((error) => {
                message.style.color = "#d33";
                if (error.code === "auth/email-already-in-use") {
                    message.textContent = "Email này đã được sử dụng!";
                } else if (error.code === "auth/weak-password") {
                    message.textContent = "Mật khẩu phải có tối thiểu 6 ký tự!";
                } else {
                    message.textContent = error.message;
                }
            }); 

    }); 