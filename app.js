const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoDate = document.getElementById("todo-date");
const todoList = document.getElementById("todo-list");
const completedList = document.getElementById("completed-list");
const toggleCompletedBtn = document.getElementById("toggle-completed-btn");
const trashList = document.getElementById("trash-list");
const toggleTrashBtn = document.getElementById("toggle-trash-btn");

// 다크 모드 토글
const darkModeToggle = document.getElementById("dark-mode-toggle");
const DARK_MODE_KEY = "darkMode";

const TODOS_KEY = "todos";
const TRASH_KEY = "trash";

// 'let'으로 변경 (데이터 삭제 시 교체해야 하므로)
let toDos = [];
let deletedToDos = [];

// REQ-101, REQ-103: localStorage에 저장 (JSON 직렬화)
function saveToDos() {
  localStorage.setItem(TODOS_KEY, JSON.stringify(toDos));
  localStorage.setItem(TRASH_KEY, JSON.stringify(deletedToDos));
}

// 리스트를 다시 그리는 함수 (분류 및 정렬)
function renderTodos() {
  // 미완료 리스트
  todoList.innerHTML = "";
  // 완료 리스트
  if (completedList) completedList.innerHTML = "";

  const uncompleted = toDos.filter((todo) => !todo.completed);
  const completed = toDos.filter((todo) => todo.completed);

  // 미완료 먼저, 최신순(가장 최근이 위)
  uncompleted
    .slice()
    .sort((a, b) => b.id - a.id)
    .forEach((todo) => paintTodo(todo, todoList));
  // 완료는 아래, 최신순(가장 최근이 위)
  completed
    .slice()
    .sort((a, b) => b.id - a.id)
    .forEach((todo) => paintTodo(todo, completedList));
}

// paintTodo: 어느 ul에 그릴지 인자로 받음
function paintTodo(newTodoObject, targetUl) {
  const li = document.createElement("li");
  li.id = newTodoObject.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!newTodoObject.completed;
  checkbox.addEventListener("change", handleToggleTodo);

  const span = document.createElement("span");
  span.innerText = newTodoObject.text;

  const editButton = document.createElement("button");
  editButton.innerText = "수정";
  editButton.addEventListener("click", handleEditTodo);

  const deleteButton = document.createElement("button");
  deleteButton.innerText = "삭제";
  deleteButton.addEventListener("click", handleDeleteTodo);

  li.appendChild(checkbox);
  li.appendChild(span);

  if (newTodoObject.date) {
    const dateSpan = document.createElement("span");
    dateSpan.innerText = newTodoObject.date;
    dateSpan.classList.add("todo-date");
    li.appendChild(dateSpan);
  }

  li.appendChild(editButton);
  li.appendChild(deleteButton);

  if (newTodoObject.completed) {
    li.classList.add("completed");
  }

  targetUl.appendChild(li);
}

// REQ-204 (삭제): 삭제 버튼 클릭 시 실행 -> 휴지통으로 이동
function handleDeleteTodo(event) {
  const li = event.target.parentElement;
  const todoId = parseInt(li.id);

  // 삭제 전 확인
  if (!window.confirm("휴지통으로 이동하시겠습니까?")) return;

  // 1. 삭제할 객체 찾기
  const todoToDelete = toDos.find((todo) => todo.id === todoId);

  if (todoToDelete) {
    // 2. toDos 배열에서 제거
    toDos = toDos.filter((todo) => todo.id !== todoId);
    // 3. deletedToDos 배열에 추가
    deletedToDos.push(todoToDelete);

    // 4. 저장 및 다시 그리기
    saveToDos();
    renderTodos();
    renderTrash();
  }
}

// 휴지통 복구
function handleRestoreTodo(event) {
  const li = event.target.parentElement;
  const todoId = parseInt(li.id);

  const todoToRestore = deletedToDos.find((todo) => todo.id === todoId);
  if (todoToRestore) {
    deletedToDos = deletedToDos.filter((todo) => todo.id !== todoId);
    toDos.push(todoToRestore);
    saveToDos();
    renderTodos();
    renderTrash();
  }
}

// 휴지통 영구 삭제
function handlePermanentDelete(event) {
  const li = event.target.parentElement;
  const todoId = parseInt(li.id);

  if (!window.confirm("정말 영구 삭제하시겠습니까? 복구할 수 없습니다."))
    return;

  deletedToDos = deletedToDos.filter((todo) => todo.id !== todoId);
  saveToDos();
  renderTrash();
}

// REQ-205: 완료 토글
function handleToggleTodo(event) {
  const li = event.target.closest("li");
  const todoId = parseInt(li.id);
  const todoToToggle = toDos.find((todo) => todo.id === todoId);
  todoToToggle.completed = !todoToToggle.completed;

  // 완료/미완료 그룹의 가장 위로 이동 (id를 갱신)
  todoToToggle.id = Date.now();

  saveToDos();
  renderTodos();
}

// REQ-203 (수정): 수정 버튼 클릭 시 실행
function handleEditTodo(event) {
  const li = event.target.parentElement;
  const todoId = parseInt(li.id); // 수정할 todo의 ID
  const todoToUpdate = toDos.find((todo) => todo.id === todoId);

  // 사용자에게서 새 텍스트 입력받기
  const newText = prompt("수정할 내용을 입력하세요:", todoToUpdate.text);

  // 사용자가 취소를 누르지 않았고, 빈 값이 아니라면
  if (newText !== null && newText.trim() !== "") {
    const newDate = prompt(
      "수정할 기한을 입력하세요 (YYYY-MM-DD):",
      todoToUpdate.date || ""
    );

    // 데이터 수정
    todoToUpdate.text = newText;
    todoToUpdate.date = newDate;

    // 저장 및 다시 그리기
    saveToDos();
    renderTodos();
  }
}

// REQ-201 (생성): 폼 제출 시 실행
function handleToDoSubmit(event) {
  event.preventDefault();
  const newTodoText = todoInput.value;
  const newTodoDate = todoDate.value;
  todoInput.value = "";
  todoDate.value = "";

  // 고유 ID와 텍스트, 완료상태를 가진 객체 생성
  const newTodoObject = {
    text: newTodoText,
    date: newTodoDate,
    id: Date.now(), // 현재 시간을 고유 ID로 사용
    completed: false, // 기본값: 미완료
  };

  toDos.push(newTodoObject); // 배열에 객체 추가
  saveToDos(); // localStorage에 저장
  renderTodos(); // 화면에 객체를 전달하여 그리기
}

todoForm.addEventListener("submit", handleToDoSubmit);

// REQ-102, REQ-103: 페이지 로드 시 데이터 복원
const savedToDos = localStorage.getItem(TODOS_KEY);
const savedTrash = localStorage.getItem(TRASH_KEY);

if (savedToDos !== null) {
  const parsedToDos = JSON.parse(savedToDos);
  toDos = parsedToDos; // toDos 배열 복원
  // REQ-202 (조회): 저장된 모든 항목을 화면에 그림
  renderTodos();
}

if (savedTrash !== null) {
  deletedToDos = JSON.parse(savedTrash);
  renderTrash();
}

// 완료된 todo 토글 버튼
if (toggleCompletedBtn && completedList) {
  toggleCompletedBtn.addEventListener("click", () => {
    const isHidden = completedList.style.display === "none";
    completedList.style.display = isHidden ? "" : "none";
    toggleCompletedBtn.innerHTML = isHidden
      ? "▼ 완료된 할 일 숨기기"
      : "▶ 완료된 할 일 보기";
  });
}

// 휴지통 토글 버튼
if (toggleTrashBtn && trashList) {
  toggleTrashBtn.addEventListener("click", () => {
    const isHidden = trashList.style.display === "none";
    trashList.style.display = isHidden ? "" : "none";
    toggleTrashBtn.innerText = isHidden ? "🗑 휴지통 숨기기" : "🗑 휴지통 보기";
  });
}

// 휴지통 리스트 그리기
function renderTrash() {
  trashList.innerHTML = "";
  deletedToDos.forEach((todo) => {
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

// 복구 버튼 클릭 시 실행
function handleRestoreTodo(event) {
  const li = event.target.parentElement;
  const todoId = parseInt(li.id);

  const todoToRestore = deletedToDos.find((todo) => todo.id === todoId);
  if (todoToRestore) {
    deletedToDos = deletedToDos.filter((todo) => todo.id !== todoId);
    toDos.push(todoToRestore);
    saveToDos();
    renderTodos();
    renderTrash();
  }
}

// 영구 삭제 버튼 클릭 시 실행
function handlePermanentDelete(event) {
  const li = event.target.parentElement;
  const todoId = parseInt(li.id);

  // 삭제 전 확인
  if (!window.confirm("정말 영구 삭제하시겠습니까?")) return;

  // 1. deletedToDos 배열에서 데이터 삭제
  deletedToDos = deletedToDos.filter((todo) => todo.id !== todoId);

  // 2. 변경된 배열을 localStorage에 저장
  saveToDos();
  renderTrash();
}

// 다크 모드 관련 함수
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
    if (document.body.classList.contains("dark-mode")) {
      disableDarkMode();
    } else {
      enableDarkMode();
    }
  });
}

// 페이지 로드 시 다크 모드 상태 복원
if (localStorage.getItem(DARK_MODE_KEY) === "enabled") {
  enableDarkMode();
}
