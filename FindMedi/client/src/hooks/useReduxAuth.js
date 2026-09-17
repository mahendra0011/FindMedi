import { useDispatch, useSelector } from 'react-redux';
import { loginUser, registerUser, logoutUser, updateUser as updateUserAction } from '@/store/slices/authSlice';
import { selectCurrentUser, selectAuthLoading, selectIsAuthenticated, selectUserRole, selectUserSettings } from '@/store/slices/authSlice';

export function useReduxAuth() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const loading = useSelector(selectAuthLoading);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectUserRole);
  const settings = useSelector(selectUserSettings);

  const login = async (email, password, role) => {
    const result = await dispatch(loginUser({ email, password, role }));
    return result.payload;
  };

  const register = async (body) => {
    const result = await dispatch(registerUser(body));
    return result.payload;
  };

  const logout = () => {
    dispatch(logoutUser());
  };

  const updateUser = (updates) => {
    dispatch(updateUserAction(updates));
  };

  return {
    user,
    loading,
    isAuthenticated,
    role,
    settings,
    login,
    register,
    logout,
    updateUser,
  };
}

export default useReduxAuth;