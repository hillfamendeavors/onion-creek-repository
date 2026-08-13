import { supabase } from '../lib/supabase.js';
import { updatePassword } from '../lib/auth.js';

const resetView = document.getElementById('resetView');
const invalidView = document.getElementById('invalidView');
const successView = document.getElementById('successView');
const newPasswordEl = document.getElementById('newPassword');
const confirmPasswordEl = document.getElementById('confirmPassword');
const resetBtn = document.getElementById('resetBtn');
const resetErrorEl = document.getElementById('resetError');

resetBtn.addEventListener('click', async () => {
  resetErrorEl.textContent = '';

  if (newPasswordEl.value.length < 6) {
    resetErrorEl.textContent = 'Password must be at least 6 characters.';
    return;
  }
  if (newPasswordEl.value !== confirmPasswordEl.value) {
    resetErrorEl.textContent = 'Passwords do not match.';
    return;
  }

  resetBtn.disabled = true;
  resetBtn.textContent = 'Setting password…';

  const { error } = await updatePassword(newPasswordEl.value);

  if (error) {
    resetErrorEl.textContent = error.message;
    resetBtn.disabled = false;
    resetBtn.textContent = 'Set Password';
    return;
  }

  resetView.style.display = 'none';
  successView.style.display = 'block';
});

supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session) {
    resetView.style.display = 'none';
    invalidView.style.display = 'block';
  }
});
