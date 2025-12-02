// 1. 모듈 가져오기.
import { TODOS_KEY, TRASH_KEY, DARK_MODE_KEY } from "./constants.js";
import { state } from "./state.js"; // state.toDos, state.deletedToDos 로 접근
import { saveToDos, loadToDos } from "./storage.js";

// DOM 요소 선택
const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoDate = document.getElementById("todo-date");
const todoList = document.getElementById("todo-list");
const sortSelect = document.getElementById("sort-select");
const completedList = document.getElementById("completed-list");
const toggleCompletedBtn = document.getElementById("toggle-completed-btn");
const trashList = document.getElementById("trash-list");
const toggleTrashBtn = document.getElementById("toggle-trash-btn");
const todoCategory = document.getElementById("todo-category");

// 통계 및 다크모드 관련 요소
const statsBackdrop = document.getElementById("stats-backdrop");
const statsCloseBtn = document.getElementById("stats-close-btn");
const darkModeToggle = document.getElementById("dark-mode-toggle");

// 리스트 그리기 함수 (state.toDos 사용)
function renderTodos() {
  todoList.innerHTML = "";
  if (completedList) completedList.innerHTML = "";

  const sortValue = sortSelect ? sortSelect.value : "newest";

  const sortFunction = (a, b) => {
    if (sortValue === "custom") return 0;
    if (sortValue === "newest") return b.id - a.id;
    else if (sortValue === "oldest") return a.id - b.id;
    else if (sortValue === "category") {
      const catA = a.category || "기타";
      const catB = b.category || "기타";
      return catA.localeCompare(catB);
    } else if (sortValue === "deadline-asc") {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    } else if (sortValue === "deadline-desc") {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    }
    return b.id - a.id;
  };

  const uncompleted = state.toDos.filter((todo) => !todo.completed);
  const completed = state.toDos.filter((todo) => todo.completed);

  uncompleted.slice().sort(sortFunction).forEach((todo) => paintTodo(todo, todoList));
  completed.slice().sort(sortFunction).forEach((todo) => paintTodo(todo, completedList));
}

if (sortSelect) {
  sortSelect.addEventListener("change", renderTodos);
}

// 남은 시간 텍스트 계산
function getRemainingText(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const due = new Date(dateString + "T23:59:59");
  const diffMs = due - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (isNaN(diffMs)) return "";
  if (diffMs < 0) return `⛔ ${Math.abs(diffDays)}일 지남`;
  if (diffDays === 0) return diffHours <= 0 ? "오늘 마감!" : `오늘 마감 (${diffHours}시간 남음)`;
  return `${diffDays}일 남음`;
}

// 화면에 할 일 그리기 (paintTodo)
function paintTodo(newTodoObject, targetUl) {
  const li = document.createElement("li");
  li.id = newTodoObject.id;
  li.draggable = true;
  li.classList.add("draggable");

  li.addEventListener("dragstart", () => {
    li.classList.add("dragging");
    if (sortSelect && sortSelect.value !== "custom") sortSelect.value = "custom";
  });

  li.addEventListener("dragend", () => {
    li.classList.remove("dragging");
    updateToDosOrder();
  });

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!newTodoObject.completed;
  checkbox.addEventListener("change", handleToggleTodo);

  const categorySpan = document.createElement("span");
  categorySpan.innerText = newTodoObject.category || "기타";
  categorySpan.classList.add("category-tag");
  if (newTodoObject.category === "개인") categorySpan.classList.add("cat-personal");
  else if (newTodoObject.category === "업무") categorySpan.classList.add("cat-work");
  else if (newTodoObject.category === "공부") categorySpan.classList.add("cat-study");
  else categorySpan.classList.add("cat-etc");

  const span = document.createElement("span");
  span.innerText = newTodoObject.text;

  const editButton = document.createElement("button");
  editButton.innerText = "수정";
  editButton.addEventListener("click", handleEditTodo);

  const deleteButton = document.createElement("button");
  deleteButton.innerText = "삭제";
  deleteButton.addEventListener("click", handleDeleteTodo);

  li.appendChild(checkbox);
  li.appendChild(categorySpan);
  li.appendChild(span);

  span.addEventListener("click", () => handleTodoClick(newTodoObject.id));

  if (newTodoObject.date) {
    const dateSpan = document.createElement("span");
    const remaining = getRemainingText(newTodoObject.date);
    dateSpan.classList.add("todo-date");
    dateSpan.innerText = newTodoObject.date + " • " + remaining;

    const due = new Date(newTodoObject.date + "T23:59:59");
    if (!newTodoObject.completed && due < new Date()) {
      dateSpan.style.color = "#e11d48";
      dateSpan.style.fontWeight = "600";
    } else if (!newTodoObject.completed) {
      const diffDays = Math.floor((due - new Date()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) {
        dateSpan.style.color = "#d97706";
        dateSpan.style.fontWeight = "600";
      }
    }
    li.appendChild(dateSpan);
  }

  li.appendChild(editButton);
  li.appendChild(deleteButton);

  if (newTodoObject.completed) li.classList.add("completed");
  targetUl.appendChild(li);
}

// 삭제 핸들러 (state.toDos 수정)
function handleDeleteTodo(event) {
  const li = event.target.parentElement;
  const todoId = parseInt(li.id);

  if (!window.confirm("휴지통으로 이동하시겠습니까?")) return;

  const todoToDelete = state.toDos.find((todo) => todo.id === todoId);

  if (todoToDelete) {
    state.toDos = state.toDos.filter((todo) => todo.id !== todoId);
    state.deletedToDos.push(todoToDelete);

    saveToDos();
    renderTodos();
    renderTrash();
    renderCalendar();
  }
}

// 복구 핸들러
function handleRestoreTodo(event) {
  const li = event.target.parentElement;
  const todoId = parseInt(li.id);

  const todoToRestore = state.deletedToDos.find((todo) => todo.id === todoId);
  if (todoToRestore) {
    state.deletedToDos = state.deletedToDos.filter((todo) => todo.id !== todoId);
    state.toDos.push(todoToRestore);
    saveToDos();
    renderTodos();
    renderTrash();
    renderCalendar();
  }
}

// 영구 삭제 핸들러
function handlePermanentDelete(event) {
  const li = event.target.parentElement;
  const todoId = parseInt(li.id);

  if (!window.confirm("정말 영구 삭제하시겠습니까? 복구할 수 없습니다.")) return;

  state.deletedToDos = state.deletedToDos.filter((todo) => todo.id !== todoId);
  saveToDos();
  renderTrash();
}

// 완료 토글 핸들러
function handleToggleTodo(event) {
  const li = event.target.closest("li");
  const todoId = parseInt(li.id);
  const todoToToggle = state.toDos.find((todo) => todo.id === todoId);
  todoToToggle.completed = !todoToToggle.completed;
  todoToToggle.id = Date.now();

  saveToDos();
  renderTodos();
  renderCalendar();
}

// 수정 핸들러
function handleEditTodo(event) {
  const li = event.target.parentElement;
  const todoId = parseInt(li.id);
  const todoToUpdate = state.toDos.find((todo) => todo.id === todoId);

  const newText = prompt("수정할 내용을 입력하세요:", todoToUpdate.text);

  if (newText !== null && newText.trim() !== "") {
    const newDate = prompt("수정할 기한을 입력하세요 (YYYY-MM-DD):", todoToUpdate.date || "");
    todoToUpdate.text = newText;
    todoToUpdate.date = newDate;
    saveToDos();
    renderTodos();
    renderCalendar();
  }
}

// 제출 핸들러
function handleToDoSubmit(event) {
  event.preventDefault();
  const newTodoText = todoInput.value;
  const newTodoDate = todoDate.value;
  const newTodoCategory = todoCategory.value;
  todoInput.value = "";
  todoDate.value = "";
  todoCategory.value = "";

  const newTodoObject = {
    text: newTodoText,
    date: newTodoDate,
    category: newTodoCategory,
    id: Date.now(),
    completed: false,
    memo: "",
  };

  state.toDos.push(newTodoObject);
  saveToDos();
  renderTodos();
  renderCalendar();
}

todoForm.addEventListener("submit", handleToDoSubmit);

// 휴지통 리스트 그리기
function renderTrash() {
  trashList.innerHTML = "";
  state.deletedToDos.forEach((todo) => {
    const li = document.createElement("li");
    li.id = todo.id;

    const span = document.createElement("span");
    span.innerText = todo.text;

    const restoreButton = document.createElement("button");
    restoreButton.innerText = "복구";
    restoreButton.addEventListener("click", handleRestoreTodo);

    const permDeleteButton = document.createElement("button");
    permDeleteButton.innerText = "영구 삭제";
    permDeleteButton.addEventListener("click", handlePermanentDelete);

    li.appendChild(span);
    if (todo.date) {
      const dateSpan = document.createElement("span");
      dateSpan.innerText = todo.date;
      dateSpan.classList.add("todo-date");
      li.appendChild(dateSpan);
    }
    li.appendChild(restoreButton);
    li.appendChild(permDeleteButton);
    trashList.appendChild(li);
  });
}

// 토글 버튼 이벤트
if (toggleCompletedBtn && completedList) {
  toggleCompletedBtn.addEventListener("click", () => {
    const isHidden = completedList.style.display === "none";
    completedList.style.display = isHidden ? "" : "none";
    toggleCompletedBtn.innerHTML = isHidden ? "▼ 완료된 할 일 숨기기" : "▶ 완료된 할 일 보기";
  });
}

if (toggleTrashBtn && trashList) {
  toggleTrashBtn.addEventListener("click", () => {
    const isHidden = trashList.style.display === "none";
    trashList.style.display = isHidden ? "" : "none";
    toggleTrashBtn.innerText = isHidden ? "🗑 휴지통 숨기기" : "🗑 휴지통 보기";
  });
}

// 다크모드
function enableDarkMode() {
  document.body.classList.add("dark-mode");
  darkModeToggle.innerText = "☀️";
  localStorage.setItem(DARK_MODE_KEY, "enabled");
}

function disableDarkMode() {
  document.body.classList.remove("dark-mode");
  darkModeToggle.innerText = "🌙";
  localStorage.setItem(DARK_MODE_KEY, "disabled");
}

if (darkModeToggle) {
  darkModeToggle.addEventListener("click", () => {
    if (document.body.classList.contains("dark-mode")) disableDarkMode();
    else enableDarkMode();
  });
}

if (localStorage.getItem(DARK_MODE_KEY) === "enabled") enableDarkMode();

// 드래그 앤 드롭
function initDragAndDrop() {
  const containers = [todoList, completedList];
  containers.forEach((container) => {
    if (!container) return;
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(container, e.clientY);
      const draggable = document.querySelector(".dragging");
      if (afterElement == null) container.appendChild(draggable);
      else container.insertBefore(draggable, afterElement);
    });
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".draggable:not(.dragging)")];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
    else return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateToDosOrder() {
  const newToDos = [];
  const uncompletedLis = todoList.querySelectorAll("li");
  uncompletedLis.forEach((li) => {
    const todo = state.toDos.find((t) => t.id === parseInt(li.id));
    if (todo) newToDos.push(todo);
  });
  const completedLis = completedList.querySelectorAll("li");
  completedLis.forEach((li) => {
    const todo = state.toDos.find((t) => t.id === parseInt(li.id));
    if (todo) newToDos.push(todo);
  });
  state.toDos.forEach((todo) => {
    if (!newToDos.find((t) => t.id === todo.id)) newToDos.push(todo);
  });
  state.toDos = newToDos;
  saveToDos();
}

initDragAndDrop();

// 캘린더 및 메모
const calendarDates = document.getElementById("calendar-dates");
const currentMonthYear = document.getElementById("current-month-year");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const selectedDateTodos = document.getElementById("selected-date-todos");
let currentDate = new Date();

// 메모 관련
const memoContent = document.getElementById("memo-content");
const memoTextarea = document.getElementById("memo-textarea");
const saveMemoBtn = document.getElementById("save-memo-btn");
const memoGuide = document.getElementById("memo-guide");
const memoTitle = document.getElementById("memo-title");
let currentSelectedTodoId = null;

function handleTodoClick(todoId) {
  currentSelectedTodoId = todoId;
  const todo = state.toDos.find((t) => t.id === todoId);
  if (!todo) return;

  const allLis = document.querySelectorAll("#todo-list li");
  allLis.forEach((li) => li.classList.remove("selected"));
  const selectedLi = document.getElementById(todoId);
  if (selectedLi) selectedLi.classList.add("selected");

  memoTitle.innerText = `메모: ${todo.text}`;
  memoGuide.style.display = "none";
  memoContent.style.display = "block";
  memoTextarea.value = todo.memo || "";
}

if (saveMemoBtn) {
  saveMemoBtn.addEventListener("click", () => {
    if (currentSelectedTodoId === null) return;
    const todo = state.toDos.find((t) => t.id === currentSelectedTodoId);
    if (todo) {
      todo.memo = memoTextarea.value;
      saveToDos();
      alert("메모가 저장되었습니다.");
    }
  });
}

function renderCalendar() {
  if (!calendarDates) return;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  currentMonthYear.innerText = `${year}년 ${month + 1}월`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevLastDay = new Date(year, month, 0);

  calendarDates.innerHTML = "";
  if (selectedDateTodos) selectedDateTodos.innerHTML = "";

  for (let i = 0; i < firstDay.getDay(); i++) {
    const dateDiv = document.createElement("div");
    dateDiv.classList.add("calendar-date", "other-month");
    dateDiv.innerText = prevLastDay.getDate() - firstDay.getDay() + 1 + i;
    calendarDates.appendChild(dateDiv);
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dateDiv = document.createElement("div");
    dateDiv.classList.add("calendar-date");
    dateDiv.innerText = i;

    const today = new Date();
    if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
      dateDiv.classList.add("today");
    }

    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;

    dateDiv.addEventListener("dragover", (e) => {
      e.preventDefault();
      dateDiv.classList.add("drag-over");
    });
    dateDiv.addEventListener("dragleave", () => dateDiv.classList.remove("drag-over"));
    dateDiv.addEventListener("drop", (e) => {
      e.preventDefault();
      dateDiv.classList.remove("drag-over");
      const draggingLi = document.querySelector(".dragging");
      if (draggingLi) {
        const todoId = parseInt(draggingLi.id);
        const todo = state.toDos.find((t) => t.id === todoId);
        if (todo) {
          todo.date = dateString;
          saveToDos();
          renderTodos();
          renderCalendar();
        }
      }
    });

    const hasTodo = state.toDos.some((todo) => !todo.completed && todo.date === dateString);
    if (hasTodo) {
      dateDiv.classList.add("has-todo");
      dateDiv.title = "할 일이 있습니다!";
    }

    dateDiv.addEventListener("click", () => {
      const prevSelected = document.querySelector(".calendar-date.selected");
      if (prevSelected) prevSelected.classList.remove("selected");
      dateDiv.classList.add("selected");

      const todosForDate = state.toDos.filter((todo) => !todo.completed && todo.date === dateString);
      if (selectedDateTodos) {
        selectedDateTodos.innerHTML = `<h3>${month + 1}월 ${i}일 일정</h3>`;
        if (todosForDate.length > 0) {
          const ul = document.createElement("ul");
          todosForDate.forEach((todo) => {
            const li = document.createElement("li");
            li.innerText = todo.text;
            ul.appendChild(li);
          });
          selectedDateTodos.appendChild(ul);
        } else {
          const p = document.createElement("p");
          p.className = "empty-message";
          p.innerText = "일정이 없습니다.";
          selectedDateTodos.appendChild(p);
        }
      }
    });
    calendarDates.appendChild(dateDiv);
  }

  const totalCells = calendarDates.children.length;
  const remainingCells = 42 - totalCells;
  for (let i = 1; i <= remainingCells; i++) {
    const dateDiv = document.createElement("div");
    dateDiv.classList.add("calendar-date", "other-month");
    dateDiv.innerText = i;
    calendarDates.appendChild(dateDiv);
  }
}

if (prevMonthBtn && nextMonthBtn) {
  prevMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  nextMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
}

// 통계 기능
(function initStatsFeature() {
  const showStatsBtn = document.getElementById("show-stats-btn");
  const showTodosBtn = document.getElementById("show-todos-btn");
  const statsSection = document.getElementById("stats-section");
  const mainContainer = document.querySelector(".main-container");

  function calculateStats() {
    const total = state.toDos.length;
    const completed = state.toDos.filter((t) => t.completed).length;
    const active = total - completed;
    const withDue = state.toDos.filter((t) => t.date).length;
    const overdue = state.toDos.filter(
      (t) => t.date && !t.completed && new Date(t.date + "T23:59:59") < new Date()
    ).length;
    const upcoming7 = state.toDos.filter((t) => {
      if (!t.date) return false;
      const diff = (new Date(t.date + "T23:59:59") - new Date()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;
    return { total, completed, active, withDue, overdue, upcoming7 };
  }

  window.renderStats = function renderStats() {
    const statsList = document.getElementById("stats-list");
    if (!statsList) return;
    const s = calculateStats();
    statsList.innerHTML = "";
    const rows = [
      ["전체 할일", s.total],
      ["완료", s.completed],
      ["미완료", s.active],
      ["마감일 있는 항목", s.withDue],
      ["마감 지난 항목", s.overdue],
      ["앞으로 7일 내 마감", s.upcoming7],
    ];
    rows.forEach((r) => {
      const li = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = r[1];
      const span = document.createElement("span");
      span.textContent = r[0];
      li.appendChild(strong);
      li.appendChild(span);
      statsList.appendChild(li);
    });
  };

  if (showStatsBtn && showTodosBtn && statsSection && mainContainer) {
    showStatsBtn.addEventListener("click", () => {
      if (statsSection) {
        statsSection.classList.add("stats-overlay");
        statsSection.style.display = "block";
      }
      if (statsBackdrop) statsBackdrop.style.display = "block";
      document.body.classList.add("stats-open");
      if (showStatsBtn) showStatsBtn.style.display = "none";
      if (showTodosBtn) showTodosBtn.style.display = "inline-block";
      try { renderStats(); } catch (e) {}
    });
    showTodosBtn.addEventListener("click", () => {
      closeStatsOverlay();
    });
  }
})();

function closeStatsOverlay() {
  const statsSection = document.getElementById("stats-section");
  const showStatsBtn = document.getElementById("show-stats-btn");
  const showTodosBtn = document.getElementById("show-todos-btn");
  
  if (statsSection) {
    statsSection.classList.remove("stats-overlay");
    statsSection.style.display = "none";
  }
  if (statsBackdrop) statsBackdrop.style.display = "none";
  document.body.classList.remove("stats-open");
  if (showStatsBtn) showStatsBtn.style.display = "inline-block";
  if (showTodosBtn) showTodosBtn.style.display = "none";
}

if (statsBackdrop) statsBackdrop.addEventListener("click", closeStatsOverlay);
if (statsCloseBtn) statsCloseBtn.addEventListener("click", closeStatsOverlay);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const statsSection = document.getElementById("stats-section");
    if (statsSection && statsSection.classList.contains("stats-overlay")) closeStatsOverlay();
  }
});

// 시작 로직
loadToDos();    // 저장소에서 데이터 불러오기
renderTodos();  // 화면 그리기
renderTrash();  // 휴지통 그리기
renderCalendar(); // 달력 그리기