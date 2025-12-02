// js/storage.js (저장소 관리)
import { TODOS_KEY, TRASH_KEY } from "./constants.js";
import { state, setTodos, setDeletedTodos } from "./state.js";

// localStorage에 저장
export function saveToDos() {
  localStorage.setItem(TODOS_KEY, JSON.stringify(state.toDos));
  localStorage.setItem(TRASH_KEY, JSON.stringify(state.deletedToDos));
  
  // (옵션) 통계 함수가 전역에 있다면 실행해서 수치 갱신
  if (typeof window.renderStats === "function") {
    window.renderStats();
  }
}

// localStorage에서 불러오기
export function loadToDos() {
  const savedToDos = localStorage.getItem(TODOS_KEY);
  const savedTrash = localStorage.getItem(TRASH_KEY);

  if (savedToDos !== null) {
    setTodos(JSON.parse(savedToDos));
  }
  
  if (savedTrash !== null) {
    setDeletedTodos(JSON.parse(savedTrash));
  }
}