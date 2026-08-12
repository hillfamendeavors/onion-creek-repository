import { getSession, signIn, signUp, requestPasswordReset } from '../lib/auth.js';

const loginFormView = document.getElementById('loginFormView');
const loggedInView = document.getElementById('loggedInView');
const emailEl = document.getElementById('login-email');
const passwordEl = document.getElementById('login-password');
const errorEl = document.getElementById('loginError');
const signupNoticeEl = document.getElementById('loginSignupNotice');
const resetNoticeEl = document.getElementById('loginResetNotice');
const signInBtn = document.getElementById('loginSignInBtn');
const signUpBtn = document.getElementById('loginSignUpBtn');
const forgotBtn = document.getElementById('loginForgotBtn');

async function withButtonLock(btn, fn) {
  btn.disabled = true;
  try {
    await fn();
  } finally {
    btn.disabled = false;
  }
}

function nextUrl() {
  const next = new URLSearchParams(location.search).get('next');
  // Same-site relative paths only — never an absolute URL from the query string.
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

signInBtn.addEventListener('click', () => withButtonLock(signInBtn, async () => {
  errorEl.textContent = '';
  const { error } = await signIn(emailEl.value.trim(), passwordEl.value);
  if (error) {
    errorEl.textContent = error.message;
    return;
  }
  location.href = nextUrl();
}));

signUpBtn.addEventListener('click', () => withButtonLock(signUpBtn, async () => {
  errorEl.textContent = '';
  const { error } = await signUp(emailEl.value.trim(), passwordEl.value);
  if (error) {
    errorEl.textContent = error.message;
    return;
  }
  signupNoticeEl.style.display = 'block';
}));

forgotBtn.addEventListener('click', () => withButtonLock(forgotBtn, async () => {
  errorEl.textContent = '';
  const { error } = await requestPasswordReset(emailEl.value.trim());
  if (error) {
    errorEl.textContent = error.message;
    return;
  }
  resetNoticeEl.style.display = 'block';
}));

getSession().then((session) => {
  if (session) {
    loginFormView.style.display = 'none';
    loggedInView.style.display = 'block';
  }
});
