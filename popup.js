const toggleBtn = document.getElementById("toggleBtn");
const statusText = document.getElementById("statusText");
const statusIndicator = document.getElementById("statusIndicator");
const commentInput = document.getElementById("commentInput");
const addBtn = document.getElementById("addBtn");
const commentsList = document.getElementById("commentsList");

function loadState() {
  chrome.storage.local.get("automationActive", (data) => {
    updateUI(data.automationActive || false);
  });
  loadComments();
}

function updateUI(isActive) {
  if (isActive) {
    toggleBtn.textContent = "⏹ Dừng";
    toggleBtn.classList.add("active");
    statusText.textContent = "✓ Chạy";
    statusIndicator.classList.add("active");
  } else {
    toggleBtn.textContent = "▶ Bật";
    toggleBtn.classList.remove("active");
    statusText.textContent = "Tắt";
    statusIndicator.classList.remove("active");
  }
}

toggleBtn.addEventListener("click", () => {
  chrome.storage.local.get("automationActive", (data) => {
    const newState = !data.automationActive;
    chrome.storage.local.set({ automationActive: newState });
    updateUI(newState);
    
    // Gửi message tới content script
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && tab.url.includes('facebook.com/reels')) {
          chrome.tabs.sendMessage(tab.id, {
            action: "toggleAutomation",
            isRunning: newState
          }).catch(() => {});
        }
      });
    });
  });
});

function loadComments() {
  chrome.storage.local.get("comments", (data) => {
    const comments = data.comments || [];
    
    if (comments.length === 0) {
      commentsList.innerHTML = '<p class="empty-message">Trống</p>';
      return;
    }
    
    commentsList.innerHTML = comments
      .map((comment, index) => `
        <div class="comment-item">
          <span class="comment-text">${escapeHtml(comment)}</span>
          <button class="delete-btn" data-index="${index}">✕</button>
        </div>
      `)
      .join("");
    
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        deleteComment(index);
      });
    });
  });
}

addBtn.addEventListener("click", () => {
  const text = commentInput.value.trim();
  
  if (!text) {
    alert("Nhập comment!");
    return;
  }
  
  if (text.length > 150) {
    alert("Quá dài (max 150)");
    return;
  }
  
  chrome.storage.local.get("comments", (data) => {
    const comments = data.comments || [];
    
    if (comments.includes(text)) {
      alert("Đã tồn tại!");
      return;
    }
    
    comments.push(text);
    chrome.storage.local.set({ comments });
    commentInput.value = "";
    loadComments();
  });
});

function deleteComment(index) {
  chrome.storage.local.get("comments", (data) => {
    const comments = data.comments || [];
    comments.splice(index, 1);
    chrome.storage.local.set({ comments });
    loadComments();
  });
}

commentInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addBtn.click();
  }
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

loadState();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes.automationActive) updateUI(changes.automationActive.newValue);
    if (changes.comments) loadComments();
  }
});
