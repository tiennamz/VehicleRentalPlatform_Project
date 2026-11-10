const auth = document.getElementById("auth");

    function switchMode() {

        auth.classList.toggle("register-mode");

        document.getElementById("loginMessage").textContent = "";
        document.getElementById("registerMessage").textContent = "";

    }



    document.getElementById("loginForm").addEventListener("submit", function (e) {

        e.preventDefault();

        document.getElementById("loginMessage").textContent =
            "Login demo thành công! Chưa kết nối Backend.";

    });


    document.getElementById("registerForm").addEventListener("submit", function (e) {

        e.preventDefault();

        const inputs = this.querySelectorAll("input");

        const password = inputs[2].value;
        const confirmPassword = inputs[3].value;

        const message = document.getElementById("registerMessage");

        if (password !== confirmPassword) {

            message.style.color = "#d33";
            message.textContent = "Mật khẩu xác nhận không khớp!";

            return;
        }

        message.style.color = "#008d82";
        message.textContent = "Đăng ký demo thành công!";

    }); 