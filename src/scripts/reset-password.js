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

  if (newPasswordEl.value !== confirmPasswordEl.value) {
    resetErrorEl.textContent = 'Passwords do not match.';
    return;
  }

  const { error } = await updatePassword(newPasswordEl.value);
  if (error) {
    resetErrorEl.textContent = error.message;
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
