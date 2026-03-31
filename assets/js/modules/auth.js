import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

export const registerAuthHandlers = ({ auth, showToast }) => {
  // --- HÀM LOGIN GOOGLE SSO CHUYÊN NGHIỆP ---
  window.loginWithGoogle = async () => {
    const btn = document.getElementById("btnGoogleLogin");
    const errorBox = document.getElementById("loginError");

    // UI Loading state
    btn.innerHTML =
      '<i class="w-5 h-5 animate-spin border-2 border-slate-400 border-t-transparent rounded-full"></i> Đang xác thực với Google...';
    btn.disabled = true;
    errorBox.classList.add("hidden");

    try {
      // Khởi tạo Google Provider và gọi Popup đăng nhập
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Nếu thành công, onAuthStateChanged sẽ tự động kích hoạt
    } catch (error) {
      console.error("Lỗi đăng nhập Google:", error);
      errorBox.classList.remove("hidden");

      // Cải tiến: Bắt lỗi unauthorized-domain và hiển thị hướng dẫn chi tiết
      if (error.code === "auth/popup-closed-by-user") {
        document.getElementById("loginErrorText").innerText =
          "Đăng nhập bị hủy. Bạn đã đóng cửa sổ đăng nhập.";
      } else if (error.code === "auth/unauthorized-domain") {
        document.getElementById("loginErrorText").innerText =
          "Lỗi: Tên miền chưa được cấp phép (Unauthorized Domain). Vui lòng vào Firebase Console -> Authentication -> Settings -> Authorized domains và thêm tên miền trang web hiện tại của bạn vào danh sách.";
      } else if (error.code === "auth/internal-error") {
        document.getElementById("loginErrorText").innerText =
          "Đăng nhập thất bại do môi trường trình duyệt chặn tài nguyên Google (CSP/extension). Vui lòng tải lại trang bằng Ctrl+F5, tắt extension can thiệp nội dung và thử lại.";
      } else {
        document.getElementById("loginErrorText").innerText =
          "Đăng nhập thất bại. Vui lòng thử lại sau. (" + error.code + ")";
      }

      // Trả lại UI ban đầu
      btn.innerHTML = `
                <svg class="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Đăng nhập bằng Google
            `;
      btn.disabled = false;
    }
  };

  window.logoutFirebase = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      showToast("Không thể đăng xuất. Vui lòng thử lại.", "error");
    }
  };
};
