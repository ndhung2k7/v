// Content Script - xử lý DOM Facebook và automation

let isAutomating = false;
let currentCommentIndex = 0;
let lastCommentTime = 0;
const MIN_COMMENT_INTERVAL = 15000; // 15 giây tối thiểu
const COMMENT_PROBABILITY = 0.45; // 45% xác suất comment

// Utility functions
function getRandomDelay(min, max) {
  return Math.random() * (max - min) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeText(element, text) {
  element.focus();
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const delay = getRandomDelay(50, 150);
    
    // Dispatch input event
    const event = new KeyboardEvent("keydown", {
      key: char,
      code: char,
      keyCode: char.charCodeAt(0),
      bubbles: true,
    });
    element.dispatchEvent(event);
    
    element.textContent += char;
    
    const inputEvent = new Event("input", { bubbles: true });
    element.dispatchEvent(inputEvent);
    
    await sleep(delay);
  }
}

function getRandomComment(comments) {
  if (comments.length === 0) return null;
  return comments[Math.floor(Math.random() * comments.length)];
}

async function findAndClickCommentButton() {
  console.log("[ReelsBot] Tìm nút comment...");
  
  // Tìm comment icon/button dựa vào aria-label
  const commentButtons = document.querySelectorAll('[aria-label*="omment"], [aria-label*="omment"]');
  
  if (commentButtons.length > 0) {
    for (let btn of commentButtons) {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        console.log("[ReelsBot] Tìm thấy nút comment, đang click...");
        btn.click();
        await sleep(1000);
        return true;
      }
    }
  }
  
  // Fallback: tìm bằng role
  const buttons = document.querySelectorAll('button[aria-label]');
  for (let btn of buttons) {
    const label = btn.getAttribute('aria-label').toLowerCase();
    if (label.includes('comment') || label.includes('bình luận')) {
      btn.click();
      await sleep(1000);
      return true;
    }
  }
  
  return false;
}

async function waitForCommentInput(timeout = 3000) {
  console.log("[ReelsBot] Chờ input comment load...");
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    // Tìm contenteditable div trong comment section
    const editableElements = document.querySelectorAll('[contenteditable="true"]');
    
    for (let elem of editableElements) {
      const rect = elem.getBoundingClientRect();
      // Phải là input có kích thước hợp lý
      if (rect.width > 100 && rect.height > 20) {
        const style = window.getComputedStyle(elem);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          console.log("[ReelsBot] Tìm thấy comment input");
          return elem;
        }
      }
    }
    
    await sleep(100);
  }
  
  console.log("[ReelsBot] Timeout - không tìm thấy input");
  return null;
}

async function submitComment() {
  console.log("[ReelsBot] Chuẩn bị gửi comment...");
  
  // Tìm nút submit (thường là Enter hoặc button gửi)
  const sendButton = document.querySelector('button[aria-label*="ubmit"], button[aria-label*="end"]');
  
  if (sendButton) {
    sendButton.click();
    console.log("[ReelsBot] Click nút gửi");
  } else {
    // Fallback: nhấn Ctrl+Enter hoặc Enter
    document.activeElement.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        ctrlKey: true,
        bubbles: true,
      })
    );
    console.log("[ReelsBot] Nhấn Enter");
  }
  
  await sleep(1500);
}

async function postComment(commentText) {
  try {
    const now = Date.now();
    if (now - lastCommentTime < MIN_COMMENT_INTERVAL) {
      console.log("[ReelsBot] Quá sớm để comment, chờ...");
      await sleep(MIN_COMMENT_INTERVAL - (now - lastCommentTime));
    }
    
    // Delay giả lập đang xem
    await sleep(getRandomDelay(2000, 4000));
    
    // Bước 1: Click nút comment
    let retries = 3;
    while (retries > 0) {
      const clicked = await findAndClickCommentButton();
      if (clicked) break;
      retries--;
      await sleep(500);
    }
    
    if (retries === 0) {
      console.log("[ReelsBot] ❌ Không click được nút comment");
      return false;
    }
    
    // Bước 2: Chờ input load
    const commentInput = await waitForCommentInput();
    if (!commentInput) {
      console.log("[ReelsBot] ❌ Comment input không load");
      return false;
    }
    
    // Bước 3: Gõ comment (giả lập typing)
    await sleep(getRandomDelay(1000, 2000));
    await typeText(commentInput, commentText);
    
    // Bước 4: Gửi comment
    await sleep(getRandomDelay(500, 1500));
    await submitComment();
    
    lastCommentTime = Date.now();
    console.log("[ReelsBot] ✅ Comment thành công:", commentText);
    return true;
  } catch (error) {
    console.error("[ReelsBot] ❌ Lỗi khi comment:", error);
    return false;
  }
}

async function scrollToNextReel() {
  console.log("[ReelsBot] Scroll sang Reel tiếp theo...");
  
  // Tìm video container
  const videoContainers = document.querySelectorAll('video');
  
  if (videoContainers.length === 0) {
    console.log("[ReelsBot] Không tìm thấy video");
    return false;
  }
  
  // Scroll smooth
  const lastVideo = videoContainers[videoContainers.length - 1];
  lastVideo.scrollIntoView({ behavior: "smooth", block: "center" });
  
  await sleep(getRandomDelay(3000, 6000));
  return true;
}

async function automationLoop() {
  console.log("[ReelsBot] 🚀 Bắt đầu automation loop");
  
  while (isAutomating) {
    try {
      // Scroll sang Reel tiếp theo
      const scrollSuccess = await scrollToNextReel();
      if (!scrollSuccess) {
        await sleep(2000);
        continue;
      }
      
      // Random quyết định comment
      const shouldComment = Math.random() < COMMENT_PROBABILITY;
      console.log(
        `[ReelsBot] Reel mới - Comment: ${shouldComment ? "có (" + Math.round(COMMENT_PROBABILITY * 100) + "%)" : "không"}`
      );
      
      if (shouldComment) {
        // Lấy danh sách comment
        chrome.storage.local.get("comments", async (data) => {
          const comments = data.comments || [];
          if (comments.length > 0) {
            const randomComment = getRandomComment(comments);
            await postComment(randomComment);
          } else {
            console.log("[ReelsBot] Danh sách comment trống");
          }
        });
        
        // Đợi comment xong
        await sleep(getRandomDelay(3000, 5000));
      }
      
      // Random pause như đang xem
      const pauseTime = getRandomDelay(5000, 15000);
      console.log(`[ReelsBot] ⏸ Dừng ${(pauseTime / 1000).toFixed(1)}s...`);
      await sleep(pauseTime);
    } catch (error) {
      console.error("[ReelsBot] Lỗi trong loop:", error);
      await sleep(2000);
    }
  }
  
  console.log("[ReelsBot] ⛔ Automation dừng");
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleAutomation") {
    isAutomating = request.isRunning;
    
    if (isAutomating) {
      console.log("[ReelsBot] ON - Automation bắt đầu");
      automationLoop();
    } else {
      console.log("[ReelsBot] OFF - Automation dừng");
    }
    
    sendResponse({ status: isAutomating ? "running" : "stopped" });
  }
});

// Kiểm tra khi page load
chrome.storage.local.get("automationActive", (data) => {
  if (data.automationActive) {
    isAutomating = true;
    automationLoop();
  }
});