// Popup script - quản lý UI

const toggleBtn = document.getElementById("toggleBtn");
const statusText = document.getElementById("statusText");
const statusIndicator = document.getElementById("statusIndicator");
const commentInput = document.getElementById("commentInput");
const addBtn = document.getElementById("addBtn");
const commentsList = document.getElementById("commentsList");

// Load initial state
function loadState() {
  chrome.storage.local.get("automationActive", (data) => {
    updateUI(data.automationActive || false);
  });
  
  loadComments();
}

function updateUI(isActive) {
  if (isActive) {
    toggleBtn.textContent = "⏹ Tắt Automation";
    toggleBtn.classList.add("active");
    statusText.textContent = "Đang chạy ✓";
    statusIndicator.classList.add("active");
  } else {
    toggleBtn.textContent = "▶ Bật Automation";
    toggleBtn.classList.remove("active");
    statusText.textContent = "Đã tắt";
    statusIndicator.classList.remove("active");
  }
}

// Toggle automation
toggleBtn.addEventListener("click", () => {
  chrome.storage.local.get("automationActive", (data) => {
    const newState = !data.automationActive;
    chrome.storage.local.set({ automationActive: newState });
    updateUI(newState);
  });
});

// Load comments from storage
function loadComments() {
  chrome.storage.local.get("comments", (data) => {
    const comments = data.comments || [];
    
    if (comments.length === 0) {
      commentsList.innerHTML = '<p class="empty-message">Chưa có comment nào</p>';
      return;
    }
    
    commentsList.innerHTML = comments
      .map((comment, index) => `
        <div class="comment-item">
          <span class="comment-text">${escapeHtml(comment)}</span>
          <button class="delete-btn" data-index="${index}">🗑</button>
        </div>
      `)
      .join("");
    
    // Add delete event listeners
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        deleteComment(index);
      });
    });
  });
}

// Add comment
addBtn.addEventListener("click", () => {
  const text = commentInput.value.trim();
  
  if (text.length === 0) {
    alert("Vui lòng nhập comment!");
    return;
  }
  
  if (text.length > 200) {
    alert("Comment quá dài (tối đa 200 ký tự)");
    return;
  }
  
  chrome.storage.local.get("comments", (data) => {
    const comments = data.comments || [];
    
    // Tránh trùng lặp
    if (comments.includes(text)) {
      alert("Comment này đã tồn tại!");
      return;
    }
    
    comments.push(text);
    chrome.storage.local.set({ comments });
    
    commentInput.value = "";
    loadComments();
  });
});

// Delete comment
function deleteComment(index) {
  chrome.storage.local.get("comments", (data) => {
    const comments = data.comments || [];
    comments.splice(index, 1);
    chrome.storage.local.set({ comments });
    loadComments();
  });
}

// Enter key to add comment
commentInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addBtn.click();
  }
});

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Load state on popup open
loadState();

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes.automationActive) {
      updateUI(changes.automationActive.newValue);
    }
    if (changes.comments) {
      loadComments();
    }
  }
});