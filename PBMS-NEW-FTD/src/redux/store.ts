import { configureStore } from '@reduxjs/toolkit';
import branchReducer from './slices/settings/branchSlice';
import permissionReducer from './slices/settings/permissionSlice';
import roleReducer from './slices/settings/roleSlice';
import EventReducer from './slices/events/eventSlice';
import EmployeeReducer from './slices/humanResource/employeeSlice';
import DepartmentReducer from './slices/humanResource/departmentSlice';
import UserAuthReducer from './slices/auth/userAuthSlice';
import ItemCategoryReducer from './slices/inventory/itemCategorySlice';
import ItemReducer from './slices/inventory/itemSlice';
import ServiceReducer from './slices/inventory/serviceSlice';
import StoreReducer from './slices/inventory/storeSlice';

export const store = configureStore({
    reducer: {
    branch: branchReducer,
    permission: permissionReducer,
    role: roleReducer,
    event: EventReducer,
    department: DepartmentReducer,
    employee: EmployeeReducer,
    userAuth: UserAuthReducer,
    itemCategory: ItemCategoryReducer,
    item: ItemReducer,
    service: ServiceReducer,
    store: StoreReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
