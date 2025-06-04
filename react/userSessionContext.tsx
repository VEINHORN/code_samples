import React, { createContext } from "react";
import { Tenant } from "@one/react-spa-chassis/dist/src/config/tenantInterface";
import { apiInstance } from "@src/services/axios-factory";
import { AxiosInstance } from "axios";
import { User } from "oidc-client-ts";
import { ConfigurationModel } from "@src/components/configuration/configuration-model";

export interface UserSessionStateInterface {
  currentTenant: Tenant;
  extendedApiInstance: AxiosInstance;
  token: string | undefined;
  user: User | null | undefined;
  tenantList: Tenant[] | undefined;
  configuration: ConfigurationModel | undefined;
}

export const userSessionStateDefaultState: UserSessionStateInterface = {
  currentTenant: { name: "", gid: "", roles: [] },
  extendedApiInstance: apiInstance,
  token: undefined,
  user: undefined,
  tenantList: undefined,
  configuration: undefined,
};

export const UserSessionContext = createContext<{
  currentUserSession: UserSessionStateInterface;
  dispatch: React.Dispatch<any>;
}>({
  currentUserSession: userSessionStateDefaultState,
  dispatch: () => null,
});
