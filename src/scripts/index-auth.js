import { getSession } from '../lib/auth.js';

const navLoginLink = document.getElementById('navLoginLink');

if (navLoginLink) {
  getSession().then((session) => {
    if (session?.user) {
      navLoginLink.textContent = 'My Account';
      navLoginLink.href = '/account/';
    }
  });
}
