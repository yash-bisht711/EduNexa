import { configureStore, createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: JSON.parse(localStorage.getItem('edunexa_user') || 'null'),
    token: localStorage.getItem('edunexa_token') || null,
  },
  reducers: {
    setSession: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('edunexa_user', JSON.stringify(action.payload.user));
      if (action.payload.token) {
        localStorage.setItem('edunexa_token', action.payload.token);
      }
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('edunexa_user', JSON.stringify(state.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('edunexa_user');
      localStorage.removeItem('edunexa_token');
    },
  },
});

export const { setSession, updateUser, logout } = authSlice.actions;
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
  },
});
