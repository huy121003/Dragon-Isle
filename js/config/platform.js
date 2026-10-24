"use strict";

/* Platform switch injected only for the native offline build. */
window.DragonPlatform = {
  offline: window.DRAGON_OFFLINE_MODE === true,
  account: {
    id: "offline-local-profile",
    username: "Offline Trainer",
    role: "player",
    offline: true
  }
};
