import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth,
    sendPasswordResetEmail,
    sendEmailVerification,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged

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

document.getElementById("loginForm").addEventListener("submit", function (e) {

        e.preventDefault();

        const email_login = document.getElementById("email_login").value.trim()
        const password_login = document.getElementById("password_login").value.trim()

        signInWithEmailAndPassword(auth, email_login, password_login)
            .then(async ({ user })=>{
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

                sessionStorage.setItem("access_token", result.data.access_token);
                Swal.fire({
                title: "Drag me!",
                icon: "success",
                timer: 2000,
                draggable: true
});
            })
            .catch((error)=>{
                const login_message = document.getElementById("loginMessage")
                login_message.style.color='red'
                login_message.textContent = error.code?.startsWith("auth/")
                    ? "Email hoặc mật khẩu không chính xác"
                    : error.message || "Không thể đăng nhập";
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
            .then(async ({ user })=>{
                await sendEmailVerification(user);
                Swal.fire({
                title: "Đăng ký thành công! Vui lòng xác minh email.",
                icon: "success",
                timer: 2000,
                draggable: true
            });
            document.querySelectorAll("input").forEach((input)=>{
                input.value= ""
            })
            switchMode()
            const response = await fetch("http://127.0.0.1:8000/auth/register", {
                method: "POST",
                headers:{
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fullname: name_register,
                    email: email_register
                })
            }

            )
            
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