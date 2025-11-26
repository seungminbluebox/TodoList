const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoDate = document.getElementById("todo-date");
const todoList = document.getElementById("todo-list");
const sortSelect = document.getElementById("sort-select");
const completedList = document.getElementById("completed-list");
const toggleCompletedBtn = document.getElementById("toggle-completed-btn");
const trashList = document.getElementById("trash-list");
const toggleTrashBtn = document.getElementById("toggle-trash-btn");

// 다크 모드 토글
const darkModeToggle = document.getElementById("dark-mode-toggle");
const DARK_MODE_KEY = "darkMode";

const TODOS_KEY = "todos";
const TRASH_KEY = "trash";

// (데이터 삭제 시 교체해야 하므로)
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

  const sortValue = sortSelect ? sortSelect.value : "newest";

  const sortFunction = (a, b) => {
    if (sortValue === "custom") return 0; // 사용자 지정: 배열 순서 유지
    if (sortValue === "newest") {
      return b.id - a.id;
    } else if (sortValue === "oldest") {
      return a.id - b.id;
    } else if (sortValue === "deadline-asc") {
      // 기한 없는 것은 뒤로
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    } else if (sortValue === "deadline-desc") {
      // 기한 없는 것은 뒤로 (또는 앞으로? 보통 기한 있는 것끼리 비교하고 없는건 맨 뒤가 깔끔함)
      // 여기서는 기한 있는 것 중 늦은 순서, 기한 없는건 맨 뒤로 배치
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    }
    return b.id - a.id;
  };

  const uncompleted = toDos.filter((todo) => !todo.completed);
  const completed = toDos.filter((todo) => todo.completed);

  // 정렬 적용
  uncompleted
    .slice()
    .sort(sortFunction)
    .forEach((todo) => paintTodo(todo, todoList));

  completed
    .slice()
    .sort(sortFunction)
    .forEach((todo) => paintTodo(todo, completedList));
}

if (sortSelect) {
  sortSelect.addEventListener("change", renderTodos);
}

// paintTodo: 어느 ul에 그릴지 인자로 받음
function paintTodo(newTodoObject, targetUl) {
  const li = document.createElement("li");
  li.id = newTodoObject.id;
  li.draggable = true; // 드래그 가능하도록 설정
  li.classList.add("draggable");

  // 드래그 이벤트 리스너 추가
  li.addEventListener("dragstart", () => {
    li.classList.add("dragging");
    // 드래그 시작 시 정렬 모드를 '사용자 지정'으로 변경
    if (sortSelect && sortSelect.value !== "custom") {
      sortSelect.value = "custom";
    }
  });

  li.addEventListener("dragend", () => {
    li.classList.remove("dragging");
    updateToDosOrder(); // 드래그 종료 후 순서 저장
  });

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

  // 할 일 클릭 시 메모 기능 활성화 (체크박스, 버튼 제외)
  span.addEventListener("click", () => {
    handleTodoClick(newTodoObject.id);
  });

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
    renderCalendar();
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
    renderCalendar();
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
  renderCalendar();
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
    renderCalendar();
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
    memo: "", // 메모 초기화
  };

  toDos.push(newTodoObject); // 배열에 객체 추가
  saveToDos(); // localStorage에 저장
  renderTodos(); // 화면에 객체를 전달하여 그리기
  renderCalendar();
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

// 드래그 앤 드롭 기능 구현
function initDragAndDrop() {
  const containers = [todoList, completedList];

  containers.forEach((container) => {
    if (!container) return;

    container.addEventListener("dragover", (e) => {
      e.preventDefault(); // 드롭 허용
      const afterElement = getDragAfterElement(container, e.clientY);
      const draggable = document.querySelector(".dragging");
      if (afterElement == null) {
        container.appendChild(draggable);
      } else {
        container.insertBefore(draggable, afterElement);
      }
    });
  });
}

// 드래그 위치 계산 함수
function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".draggable:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

// 변경된 순서대로 toDos 배열 업데이트 및 저장
function updateToDosOrder() {
  const newToDos = [];

  // 1. 미완료 리스트 순서대로 추가
  const uncompletedLis = todoList.querySelectorAll("li");
  uncompletedLis.forEach((li) => {
    const todo = toDos.find((t) => t.id === parseInt(li.id));
    if (todo) newToDos.push(todo);
  });

  // 2. 완료 리스트 순서대로 추가
  const completedLis = completedList.querySelectorAll("li");
  completedLis.forEach((li) => {
    const todo = toDos.find((t) => t.id === parseInt(li.id));
    if (todo) newToDos.push(todo);
  });

  // 3. 혹시 누락된 데이터가 있다면 추가 (안전장치)
  toDos.forEach((todo) => {
    if (!newToDos.find((t) => t.id === todo.id)) {
      newToDos.push(todo);
    }
  });

  toDos = newToDos;
  saveToDos();
}

// 초기화 시 드래그 앤 드롭 설정
initDragAndDrop();

// 캘린더 관련 변수 및 함수
const calendarDates = document.getElementById("calendar-dates");
const currentMonthYear = document.getElementById("current-month-year");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const selectedDateTodos = document.getElementById("selected-date-todos");

let currentDate = new Date();

// 메모 관련 요소
const memoContent = document.getElementById("memo-content");
const memoTextarea = document.getElementById("memo-textarea");
const saveMemoBtn = document.getElementById("save-memo-btn");
const memoGuide = document.getElementById("memo-guide");
const memoTitle = document.getElementById("memo-title");

let currentSelectedTodoId = null;

// 할 일 클릭 시 메모 섹션 표시
function handleTodoClick(todoId) {
  currentSelectedTodoId = todoId;
  const todo = toDos.find((t) => t.id === todoId);

  if (!todo) return;

  // 선택된 스타일 적용
  const allLis = document.querySelectorAll("#todo-list li");
  allLis.forEach((li) => li.classList.remove("selected"));
  const selectedLi = document.getElementById(todoId);
  if (selectedLi) selectedLi.classList.add("selected");

  // 메모 섹션 업데이트
  memoTitle.innerText = `메모: ${todo.text}`;
  memoGuide.style.display = "none";
  memoContent.style.display = "block";
  memoTextarea.value = todo.memo || "";
}

// 메모 저장
if (saveMemoBtn) {
  saveMemoBtn.addEventListener("click", () => {
    if (currentSelectedTodoId === null) return;

    const todo = toDos.find((t) => t.id === currentSelectedTodoId);
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

  // 헤더 업데이트
  currentMonthYear.innerText = `${year}년 ${month + 1}월`;

  // 이번 달의 첫 날과 마지막 날
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 지난 달의 마지막 날
  const prevLastDay = new Date(year, month, 0);

  // 날짜 초기화
  calendarDates.innerHTML = "";
  // 선택된 날짜 할 일 목록 초기화 (달이 바뀌면 초기화하거나 유지할 수 있음, 여기서는 초기화)
  if (selectedDateTodos) selectedDateTodos.innerHTML = "";

  // 지난 달 날짜 채우기
  for (let i = 0; i < firstDay.getDay(); i++) {
    const dateDiv = document.createElement("div");
    dateDiv.classList.add("calendar-date", "other-month");
    dateDiv.innerText = prevLastDay.getDate() - firstDay.getDay() + 1 + i;
    calendarDates.appendChild(dateDiv);
  }

  // 이번 달 날짜 채우기
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dateDiv = document.createElement("div");
    dateDiv.classList.add("calendar-date");
    dateDiv.innerText = i;

    // 오늘 날짜 표시
    const today = new Date();
    if (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      i === today.getDate()
    ) {
      dateDiv.classList.add("today");
    }

    // 해당 날짜에 할 일이 있는지 확인
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      i
    ).padStart(2, "0")}`;

    // 드래그 앤 드롭 이벤트 추가 (날짜에 드롭 시 기한 변경)
    dateDiv.addEventListener("dragover", (e) => {
      e.preventDefault();
      dateDiv.classList.add("drag-over");
    });

    dateDiv.addEventListener("dragleave", () => {
      dateDiv.classList.remove("drag-over");
    });

    dateDiv.addEventListener("drop", (e) => {
      e.preventDefault();
      dateDiv.classList.remove("drag-over");

      const draggingLi = document.querySelector(".dragging");
      if (draggingLi) {
        const todoId = parseInt(draggingLi.id);
        const todo = toDos.find((t) => t.id === todoId);
        if (todo) {
          if (
            confirm(
              `'${todo.text}'의 기한을 ${year}년 ${
                month + 1
              }월 ${i}일로 변경하시겠습니까?`
            )
          ) {
            todo.date = dateString;
            saveToDos();
            renderTodos();
            renderCalendar();
          }
        }
      }
    });

    // 미완료된 할 일 중 해당 날짜인 것 확인
    const hasTodo = toDos.some(
      (todo) => !todo.completed && todo.date === dateString
    );

    if (hasTodo) {
      dateDiv.classList.add("has-todo");
      dateDiv.title = "할 일이 있습니다!";
    }

    // 날짜 클릭 이벤트: 할 일 목록 보여주기 (HTML 요소 추가 방식)
    dateDiv.addEventListener("click", () => {
      // 이전에 선택된 날짜 스타일 제거 (선택적)
      const prevSelected = document.querySelector(".calendar-date.selected");
      if (prevSelected) prevSelected.classList.remove("selected");
      dateDiv.classList.add("selected");

      const todosForDate = toDos.filter(
        (todo) => !todo.completed && todo.date === dateString
      );

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

  // 다음 달 날짜 채우기 (남은 칸 채우기)
  const totalCells = calendarDates.children.length;
  const remainingCells = 42 - totalCells; // 6주 기준 (7 * 6 = 42)

  for (let i = 1; i <= remainingCells; i++) {
    const dateDiv = document.createElement("div");
    dateDiv.classList.add("calendar-date", "other-month");
    dateDiv.innerText = i;
    calendarDates.appendChild(dateDiv);
  }
}

// 달 이동 이벤트 리스너
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

// 초기 캘린더 렌더링
renderCalendar();
