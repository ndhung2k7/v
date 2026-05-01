// Service Worker - quản lý state và xử lý messages

let isRunning = false;

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-automation") {
    isRunning = !isRunning;
    chrome.storage.local.set({ automationActive: isRunning });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "toggleAutomation",
        isRunning: isRunning,
      }).catch(() => {});
    });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.automationActive) {
    isRunning = changes.automationActive.newValue;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "toggleAutomation",
        isRunning: isRunning,
      }).catch(() => {});
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url.includes("/reels/")) {
    chrome.storage.local.get("automationActive", (data) => {
      if (data.automationActive) {
        chrome.tabs.sendMessage(tabId, {
          action: "toggleAutomation",
          isRunning: true,
        }).catch(() => {});
      }
    });
  }
});