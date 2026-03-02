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

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here if needed
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png', // Customize icon
    data: payload.data // Pass data containing tableId
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification.data);
  event.notification.close();

  // Check for tableId in data
  let urlToOpen = '/';
  const data = event.notification.data;
  
  if (data && data.workspaceId) {
      urlToOpen = `/workspace?id=${data.workspaceId}`;
      if (data.tableId) {
          urlToOpen += `&tableId=${data.tableId}`;
      }
      
      if (data.taskId) {
        urlToOpen += `&taskId=${data.taskId}`;
      }

      if (data.type === 'chat_message' || data.type === 'task_chat') {
        urlToOpen += `&tab=chat`;
      } else if (data.type === 'file_comment') {
        urlToOpen += `&tab=files`;
      }
  } // Fallback logic could go here if workspaceId is missing but tableId is present.

  // This looks to see if the current is already open and focuses if it is
  event.waitUntil(clients.matchAll({
    type: "window"
  }).then((clientList) => {
    for (const client of clientList) {
      if ((urlToOpen === '/' && client.url === self.registration.scope) || (urlToOpen !== '/' && client.url.includes(urlToOpen)) && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(urlToOpen);
  }));
});
