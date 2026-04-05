// @ts-nocheck
import {
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";

const GOOGLE_LOGIN_BUTTON_DEFAULT_HTML = `
  <svg class="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
  Đăng nhập bằng Google
`;

const toSafeErrorCode = (error) => String(error?.code || "unknown").trim();

const hasInvalidActionMessage = (error) =>
  String(error?.message || "")
    .toLowerCase()
    .includes("the requested action is invalid");

const getGoogleLoginErrorMessage = (error) => {
  const errorCode = toSafeErrorCode(error);
  if (
    hasInvalidActionMessage(error) ||
    errorCode === "auth/invalid-action-code"
  ) {
    return "Yêu cầu xác thực đã hết hạn hoặc không hợp lệ. Vui lòng tải lại trang và đăng nhập lại từ màn hình chính.";
  }
  if (errorCode === "auth/popup-closed-by-user") {
    return "Đăng nhập bị hủy. Bạn đã đóng cửa sổ đăng nhập.";
  }
  if (errorCode === "auth/unauthorized-domain") {
    return "Tên miền chưa được cấp phép trên Firebase Auth. Vào Firebase Console -> Authentication -> Settings -> Authorized domains và thêm tên miền hiện tại.";
  }
  if (errorCode === "auth/operation-not-allowed") {
    return "Google Sign-In đang bị tắt trong Firebase Authentication. Vui lòng bật provider Google trong mục Sign-in method.";
  }
  if (errorCode === "auth/operation-not-supported-in-this-environment") {
    return "Trình duyệt hiện tại chặn đăng nhập popup. Hệ thống sẽ chuyển sang redirect, nếu vẫn lỗi hãy dùng cửa sổ ẩn danh hoặc trình duyệt khác.";
  }
  if (errorCode === "auth/popup-blocked") {
    return "Trình duyệt đã chặn popup đăng nhập. Vui lòng cho phép popup cho trang này rồi thử lại.";
  }
  if (errorCode === "auth/internal-error") {
    return "Đăng nhập thất bại do môi trường trình duyệt chặn tài nguyên Google (CSP/extension). Vui lòng tải lại trang bằng Ctrl+F5, tắt extension can thiệp nội dung và thử lại.";
  }
  return `Đăng nhập thất bại. Vui lòng thử lại sau. (${errorCode})`;
};

const setGoogleLoginButtonLoading = (button, isLoading) => {
  if (!button) return;
  if (isLoading) {
    button.innerHTML =
      '<i class="w-5 h-5 animate-spin border-2 border-slate-400 border-t-transparent rounded-full"></i> Đang xác thực với Google...';
    button.disabled = true;
    return;
  }
  button.innerHTML = GOOGLE_LOGIN_BUTTON_DEFAULT_HTML;
  button.disabled = false;
};

const showLoginError = (message, showToast) => {
  const errorBox = document.getElementById("loginError");
  const errorText = document.getElementById("loginErrorText");
  if (errorText) {
    errorText.innerText = message;
  }
  if (errorBox) {
    errorBox.classList.remove("hidden");
  }
  showToast?.(message, "error", 5600);
};

export const registerAuthHandlers = ({ auth, showToast }) => {
  let isLoginInProgress = false;

  // Bắt lỗi trả về từ redirect flow để hiển thị thông báo rõ ràng thay vì lỗi mơ hồ.
  void getRedirectResult(auth).catch((error) => {
    console.error("Lỗi redirect đăng nhập Google:", error);
    showLoginError(getGoogleLoginErrorMessage(error), showToast);
  });

  globalThis.loginWithGoogle = async () => {
    const btn = document.getElementById("btnGoogleLogin");
    const errorBox = document.getElementById("loginError");

    if (isLoginInProgress) return;
    isLoginInProgress = true;
    setGoogleLoginButtonLoading(btn, true);
    errorBox?.classList.add("hidden");

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    let keepLoadingState = false;

    try {
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      // Khi thành công, onAuthStateChanged sẽ tự xử lý chuyển UI.
      return;
    } catch (error) {
      const errorCode = toSafeErrorCode(error);
      const shouldFallbackToRedirect =
        errorCode === "auth/popup-blocked" ||
        errorCode === "auth/operation-not-supported-in-this-environment";

      if (shouldFallbackToRedirect) {
        try {
          keepLoadingState = true;
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          console.error(
            "Lỗi fallback redirect đăng nhập Google:",
            redirectError,
          );
          showLoginError(getGoogleLoginErrorMessage(redirectError), showToast);
          return;
        }
      }

      console.error("Lỗi đăng nhập Google:", error);
      showLoginError(getGoogleLoginErrorMessage(error), showToast);
    } finally {
      if (!keepLoadingState) {
        setGoogleLoginButtonLoading(btn, false);
        isLoginInProgress = false;
      }
    }
  };

  globalThis.logoutFirebase = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      showToast("Không thể đăng xuất. Vui lòng thử lại.", "error");
    }
  };
};


