const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoList = document.getElementById("todo-list");

const TODOS_KEY = "todos";

// 'let'으로 변경 (데이터 삭제 시 교체해야 하므로)
let toDos = []; 

// REQ-101, REQ-103: localStorage에 저장 (JSON 직렬화)
function saveToDos() {
  localStorage.setItem(TODOS_KEY, JSON.stringify(toDos));
}

// REQ-204 (삭제): 삭제 버튼 클릭 시 실행
function handleDeleteTodo(event) {
  // parentElement는 그 버튼의 부모인 <li>
  const li = event.target.parentElement;
  
  // 1. 화면에서 선택한 항목 <li> 삭제
  li.remove();
  
  // 2. toDos 배열에서 데이터 삭제
  // li.id는 문자열이므로 숫자로 변환(parseInt)
  // 클릭한 li의 id와 다른 id를 가진 todo들만 남김 (삭제버튼 누른 것 제외 나머지만 남김)
  toDos = toDos.filter((todo) => todo.id !== parseInt(li.id));
  
  // 3. 변경된 배열을 localStorage에 저장
  saveToDos();
}

// REQ-203 (수정): 수정 버튼 클릭 시 실행
function handleEditTodo(event) {
  const li = event.target.parentElement;
  const span = li.querySelector("span"); // <li> 안의 <span> 태그
  const todoId = parseInt(li.id); // 수정할 todo의 ID
  
  // 사용자에게서 새 텍스트 입력받기
  const newText = prompt("수정할 내용을 입력하세요:", span.innerText);

  // 사용자가 취소를 누르지 않았고, 빈 값이 아니라면
  if (newText !== null && newText.trim() !== "") {
    // 1. 화면(DOM) 업데이트
    span.innerText = newText;
    
    // 2. toDos 배열에서 데이터 수정
    // find로 ID가 일치하는 객체를 찾음
    const todoToUpdate = toDos.find((todo) => todo.id === todoId);
    todoToUpdate.text = newText; // 해당 객체의 text 속성 변경
    
    // 3. 변경된 배열을 localStorage에 저장
    saveToDos();
  }
}

// REQ-201 (생성) + REQ-202 (조회): 화면에 할 일 그리기
function paintTodo(newTodoObject) {
  // <li> 태그 생성
  const li = document.createElement("li");
  li.id = newTodoObject.id; // <li>에 고유 ID 부여 (나중에 삭제/수정 시 사용)

  // <span> 태그 (할 일 텍스트)
  const span = document.createElement("span");
  span.innerText = newTodoObject.text;

  // REQ-203 (수정) 버튼 생성
  const editButton = document.createElement("button");
  editButton.innerText = "수정";
  editButton.addEventListener("click", handleEditTodo);
  
  // REQ-204 (삭제) 버튼 생성
  const deleteButton = document.createElement("button");
  deleteButton.innerText = "삭제";
  deleteButton.addEventListener("click", handleDeleteTodo);

  // <li> 안에 <span>, 수정버튼, 삭제버튼 추가
  li.appendChild(span);
  li.appendChild(editButton);
  li.appendChild(deleteButton);
  
  // <ul> 안에 <li> 추가
  todoList.appendChild(li);
}

// REQ-201 (생성): 폼 제출 시 실행
function handleToDoSubmit(event) {
  event.preventDefault();
  const newTodoText = todoInput.value;
  todoInput.value = "";

  // 고유 ID와 텍스트를 가진 객체 생성
  const newTodoObject = {
    text: newTodoText,
    id: Date.now(), // 현재 시간을 고유 ID로 사용
  };

  toDos.push(newTodoObject); // 배열에 객체 추가
  paintTodo(newTodoObject);  // 화면에 객체를 전달하여 그리기
  saveToDos();               // localStorage에 저장
}

todoForm.addEventListener("submit", handleToDoSubmit);


// REQ-102, REQ-103: 페이지 로드 시 데이터 복원
const savedToDos = localStorage.getItem(TODOS_KEY);

if (savedToDos !== null) {
  const parsedToDos = JSON.parse(savedToDos);
  toDos = parsedToDos; // toDos 배열 복원
  // REQ-202 (조회): 저장된 모든 항목을 화면에 그림
  parsedToDos.forEach(paintTodo); 
}