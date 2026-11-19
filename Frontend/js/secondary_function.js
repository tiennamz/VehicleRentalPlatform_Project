// Hàm hiển thị thông báo Toast bằng arrow function
const showToast = (message) => {
  const toastText = document.getElementById("toastText");
  toastText.textContent = message;
};

// 1. Xử lý Button
document.getElementById("btnPrimary").addEventListener("click", () => {
  showToast("Đã bấm nút Primary!");
});

document.getElementById("btnSecondary").addEventListener("click", () => {
  showToast("Đã bấm nút Secondary!");
});

document.getElementById("btnDanger").addEventListener("click", () => {
  showToast("Đã bấm nút Danger!");
});

// 3. Xử lý Form
const infoForm = document.getElementById("infoForm");
infoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  showToast(`Đã gửi biểu mẫu cho tài khoản: ${username}`);
  infoForm.reset();
});

// 4. Xử lý Modal
const modalBox = document.getElementById("modalBox");
const closeModal = () => {
  modalBox.style.opacity = "0.5";
  showToast("Đã đóng/hủy hộp thoại xác nhận.");
};

document.getElementById("modalCloseBtn").addEventListener("click", closeModal);
document.getElementById("modalCancelBtn").addEventListener("click", closeModal);
document.getElementById("modalConfirmBtn").addEventListener("click", () => {
  modalBox.style.opacity = "1";
  showToast("Thành công! Thao tác đã lưu.");
});

// 7. Xử lý Phân trang (Pagination)
let currentPage = 1;
const pageButtons = document.querySelectorAll(".page-num");

const updateActivePage = (newPage) => {
  currentPage = newPage;
  pageButtons.forEach((btn) => {
    const page = Number(btn.dataset.page);
    btn.classList.toggle("active", page === currentPage);
  });
  showToast(`Đang xem trang ${currentPage}`);
};

pageButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    updateActivePage(Number(btn.dataset.page));
  });
});

document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) updateActivePage(currentPage - 1);
});

document.getElementById("nextPage").addEventListener("click", () => {
  if (currentPage < 3) updateActivePage(currentPage + 1);
});

// 8. Xử lý Upload ảnh có xem trước
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const previewImage = document.getElementById("previewImage");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const removePreviewBtn = document.getElementById("removePreviewBtn");

const handleFile = (file) => {
  if (!file) return;
  const validTypes = ["image/png", "image/jpeg"];
  if (!validTypes.includes(file.type)) {
    showToast("Chỉ hỗ trợ định dạng PNG hoặc JPG!");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("Dung lượng ảnh tối đa là 5MB!");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    previewImage.hidden = false;
    previewPlaceholder.hidden = true;
    showToast("Tải ảnh xem trước thành công!");
  };
  reader.readAsDataURL(file);
};

dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  handleFile(e.target.files[0]);
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  handleFile(e.dataTransfer.files[0]);
});

removePreviewBtn.addEventListener("click", () => {
  previewImage.src = "";
  previewImage.hidden = true;
  previewPlaceholder.hidden = false;
  fileInput.value = "";
  showToast("Đã xóa ảnh xem trước.");
});