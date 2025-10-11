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
import StockMovementReducer from './slices/inventory/stockMovementSlice';
import UnitReducer from './slices/inventory/unitSlice';
import ClientReducer from './slices/sales/clientSlice';
import ProjectReducer from './slices/projects/projectSlice';
import ProjectSaleReducer from './slices/projects/projectSaleSlice';
import ExhibitionReducer from './slices/exhibition/exhibitionSlice';
import ExhibitionExpenseReducer from './slices/exhibition/exhibitionExpenseSlice';
import ExhibitionStoreReducer from './slices/exhibition/exhibitionStoreSlice';
import ExhibitionInventoryRecordReducer from './slices/exhibition/exhibitionInventoryRecordSlice';
import BranchExpenseReducer from './slices/expenses/branchExpenseSlice';
import StoreInventoryReducer from './slices/inventory/storeInventorySlice';
import ExhibitionStoreInventoryReducer from './slices/exhibition/exhibitionStoreInventory';
import CreditSaleReducer from './slices/sales/creditSaleSlice';

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
    store: StoreReducer,
    stockMvt: StockMovementReducer,
    units: UnitReducer,
    client: ClientReducer,
    project: ProjectReducer,
    projectSale: ProjectSaleReducer,
    exhibition: ExhibitionReducer,
    exhibitionExpense: ExhibitionExpenseReducer,
    exhibitionStore: ExhibitionStoreReducer,
    exhibitionInventoryRecord: ExhibitionInventoryRecordReducer,
    branchExpense: BranchExpenseReducer,
    storeInventory: StoreInventoryReducer,
    exhibitionStoreInventory: ExhibitionStoreInventoryReducer,
    creditSale: CreditSaleReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
