// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
  apiKey: "AIzaSyBIUK8vR4o_0K-TVUy_bA0w_Z7WHY165Eo",
  authDomain: "smart-manage-8aa4e.firebaseapp.com",
  projectId: "smart-manage-8aa4e",
  storageBucket: "smart-manage-8aa4e.firebasestorage.app",
  messagingSenderId: "575987993996",
  appId: "1:575987993996:web:e971ed7d1a448c8826daa9",
  measurementId: "G-LQKV5LJ37P"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Add install and activate events to force service worker updates
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activating...');
  event.waitUntil(clients.claim());
});

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  try {
    const data = payload.data || {};
    const type = data.type || 'generic';
    
    // Extract title and body from payload.notification OR payload.data (for data-only messages)
    const notificationTitle = payload.notification?.title || data.title || 'Incoming Call';
    const bodyText = payload.notification?.body || data.body || 'New message';
    const notificationOptions = {
        body: bodyText,
        icon: '/logo.png',
        data: data,
        tag: type === 'incoming_call' ? 'call-' + (data.callerId || Date.now()) : type,
        actions: type === 'incoming_call' ? [
        { action: 'answer', title: '📞 Answer' },
        { action: 'reject', title: '❌ Decline' }
        ] : [],
        requireInteraction: true, // Crucial for calls - stays until user acts
        renotify: true, // Triggers every time a fresh push arrives for the same tag
        silent: false,
        sound: type === 'incoming_call' ? '/ringtone.wav' : undefined,
        vibrate: type === 'incoming_call' ? [500, 200, 500, 200, 500, 200, 500, 200, 500, 200, 1000] : [100],
    };

    console.log('[firebase-messaging-sw.js] Showing notification:', notificationTitle, notificationOptions);
    return self.registration.showNotification(notificationTitle, notificationOptions);
  } catch (err) {
    console.error('[firebase-messaging-sw.js] Error in onBackgroundMessage:', err);
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification.data);
  const data = event.notification.data;
  const action = event.action;

  event.notification.close();

  if (action === 'reject') {
      // Logic to tell server call was rejected could go here via a fetch
      return;
  }

  let urlToOpen = '/';
  if (data) {
      if (data.type === 'incoming_call') {
          urlToOpen = `/chat?userId=${data.callerId}&autoAccept=true`;
      } else if (data.workspaceId) {
          urlToOpen = `/workspace?id=${data.workspaceId}`;
          if (data.tableId) urlToOpen += `&tableId=${data.tableId}`;
          if (data.taskId) urlToOpen += `&taskId=${data.taskId}`;
          if (data.type === 'chat_message' || data.type === 'task_chat') {
              urlToOpen += `&tab=chat`;
          } else if (data.type === 'file_comment') {
              urlToOpen += `&tab=files`;
          }
      }
  }

  event.waitUntil(clients.matchAll({
    type: "window"
  }).then((clientList) => {
    for (const client of clientList) {
      if ((urlToOpen === '/' && client.url === self.registration.scope) || (urlToOpen !== '/' && client.url.includes(urlToOpen)) && 'focus' in client) {
          return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(urlToOpen);
  }));
});
