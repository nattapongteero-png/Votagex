import { getCurrentUser, getStoredAuthUser } from '../services/firebase';

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

export function isTripOwner(trip) {
  const currentUser = getCurrentUser();
  if (currentUser && trip.ownerUid) {
    return trip.ownerUid === currentUser.uid;
  }
  const authUser = getStoredAuthUser();
  const userName = authUser ? authUser.displayName : (localStorage.getItem('votagex_username') || '');
  return trip.profileName && trip.profileName === userName;
}

export function isTripMember(trip) {
  const members = trip.members || [];
  const authUser = getStoredAuthUser();
  const userName = authUser ? authUser.displayName : (localStorage.getItem('votagex_username') || '');
  return members.some(m => m.name === userName);
}
