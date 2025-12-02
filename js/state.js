// js/state.js

// 상태(데이터)를 담을 객체
export const state = {
  toDos: [],
  deletedToDos: [],
};

// 데이터를 갱신할 때 사용할 함수들
export function setTodos(newTodos) {
  state.toDos = newTodos;
}

export function setDeletedTodos(newDeletedTodos) {
  state.deletedToDos = newDeletedTodos;
}