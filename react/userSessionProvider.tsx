import React, { FunctionComponent, useEffect, useReducer } from "react";
import { useAuth } from "react-oidc-context";
import { SESSION_CONTEXT_TYPE } from "@one/react-spa-chassis/dist/src/config/constants";
import createStore, {
  ActionType,
  SessionStorageInterface,
} from "@src/config/sessionContext/sessionStorage";
import sessionStorageUtils from "@one/react-spa-chassis/dist/src/utils/sessionStorageUtils";
import {
  UserSessionContext,
  userSessionStateDefaultState,
  UserSessionStateInterface,
} from "@src/hooks/userSession/userSessionContext";
import { apiInstance, centerAppInstance } from "@src/services/axios-factory";
import { addBearerToken } from "@src/utils/axios";
import _ from "lodash";
import { showNotificationError } from "@one/react-spa-chassis/dist/src/layouts/Notification";
import { Tenant } from "@one/react-spa-chassis/dist/src/config/tenantInterface";
import { logger } from "@src/utils/logger";
import { useTranslation } from "react-i18next";
import apiPaths from "@one/react-spa-chassis/dist/src/config/apiPath";
import router from "@src/routes/router";

type UserSessionProviderProps = {
  children?: React.ReactNode;
};

type TenantResponse = {
  id: string;
  name: string;
  products: number[] | undefined | null;
};

export const clearUserSessionContext = () => {
  sessionStorageUtils.removeAll();
};

export const UserSessionProvider: FunctionComponent<
  UserSessionProviderProps
> = ({ children }) => {
  const auth = useAuth();
  const { t } = useTranslation();
  const initialized = auth?.isAuthenticated ?? "";
  const token = auth?.user?.access_token ?? "";

  const loadTenantsAndRoles = async () => {
    let tenantData: Tenant[] = [];
    const extendedCenterAppApiInstance = initialized
      ? addBearerToken(centerAppInstance, token)
      : centerAppInstance;

    return extendedCenterAppApiInstance
      .get("/Tenants")
      .then((tenants) => {
        tenants.data.map((tenant: TenantResponse) => {
          tenantData.push({
            name: tenant?.name,
            gid: tenant?.id,
          });
        });
      })
      .then(() => {
        let promiseMap: Promise<any>[] = [];
        tenantData.forEach((tenant) => {
          promiseMap.push(
            extendedCenterAppApiInstance
              .get("/Tenants/" + tenant.gid + "/Users/Me")
              .then((userInfo) => {
                return userInfo?.data?.roles;
              })
              .catch((error) => {
                logger.error(
                  "Error while retrieving roles for Tenant",
                  tenant.gid,
                  tenant.name,
                  error,
                );
              }),
          );
        });
        return Promise.all(promiseMap);
      })
      .then((roles) => {
        roles.forEach((roleElement, i) => (tenantData[i].roles = roleElement));
        return Promise.resolve(tenantData);
      })
      .catch((error) => {
        logger.error("Failed to retrieve tenant specific data, ", error);
        showNotificationError(`${t("errors.couldNotLoadTenantSpecificData")}`);
        return Promise.reject(error);
      });
  };

  const getNewState = (state: UserSessionStateInterface) => {
    const extendedApiInstance = initialized
      ? addBearerToken(apiInstance, token, state.currentTenant?.gid)
      : apiInstance;

    const oldState = sessionStorageUtils.get(SESSION_CONTEXT_TYPE);
    const newState: UserSessionStateInterface = {
      currentTenant: {
        name: state?.currentTenant?.name ?? "",
        gid: state?.currentTenant?.gid ?? "",
        roles: _.get(state?.currentTenant, "roles") ?? [],
      },
      token: token,
      extendedApiInstance: extendedApiInstance,
      user: auth?.user,
      tenantList: state?.tenantList ?? oldState?.tenantList,
      configuration: state?.configuration,
    };

    return newState;
  };

  const reducer = (state: UserSessionStateInterface, action: ActionType) => {
    const newState: UserSessionStateInterface = getNewState(action.payload);
    sessionStorageUtils.set(SESSION_CONTEXT_TYPE, newState);
    return newState;
  };

  const store = createStore(
    {
      currentTenant: { name: "", gid: "", roles: [] },
      tenantList: [],
    },
    reducer,
  );

  const persistData = (initialState: SessionStorageInterface | undefined) => {
    let newData = sessionStorageUtils.get(SESSION_CONTEXT_TYPE) || null;

    if (!newData) {
      sessionStorageUtils.set(SESSION_CONTEXT_TYPE, initialState);
      newData = initialState;
    }
    return {
      currentTenant: newData.currentTenant,
      extendedApiInstance: initialized
        ? addBearerToken(apiInstance, token, newData?.currentTenant?.gid)
        : apiInstance,
      tenantList: newData.tenantList,
      token: newData.token,
      user: newData.user,
      configuration: newData.configuration,
    };
  };

  const [currentUserSession, dispatch] = useReducer(
    store?.reducer || (() => {}),
    persistData(store?.state) || userSessionStateDefaultState,
  );

  const isInvalidToken = () => {
    return (
      (currentUserSession?.user !== undefined &&
        auth?.user?.access_token !== currentUserSession?.token) ||
      !auth?.user?.id_token
    );
  };

  const populateUserSessionWithTenantInformation = async () => {
    if (isInvalidToken()) {
      logger.warning("invalid token");
      clearUserSessionContext();
      auth.signoutSilent();
    } else {
      const tenantList = await loadTenantsAndRoles();
      const temp = userSessionStateDefaultState;
      const urlParams = new URLSearchParams(window.location.search);
      const queryTenantId = urlParams.get("tenantid");

      if (_.isNull(queryTenantId)) {
        temp.currentTenant =
          currentUserSession?.currentTenant ||
          userSessionStateDefaultState.currentTenant;
      } else {
        const queryTenant = tenantList.find(
          (tenant) => tenant.gid === queryTenantId,
        );

        if (_.isUndefined(queryTenant)) {
          showNotificationError(
            `${t("errors.invalidTenantId", { queryTenantId: queryTenantId })}`,
          );
          temp.currentTenant =
            currentUserSession?.currentTenant ||
            userSessionStateDefaultState.currentTenant;
        } else {
          temp.currentTenant = queryTenant;
        }

        router.navigate(apiPaths.overviewUrl);
      }
      temp.tenantList = tenantList;
      temp.extendedApiInstance = initialized
        ? addBearerToken(apiInstance, token, "")
        : apiInstance;
      temp.configuration =
        currentUserSession?.configuration ||
        userSessionStateDefaultState.configuration;

      dispatch({ type: SESSION_CONTEXT_TYPE, payload: temp });
    }
  };

  useEffect(() => {
    if (initialized) {
      populateUserSessionWithTenantInformation().then(() => {});
    }
  }, [initialized]);

  return (
    <UserSessionContext.Provider
      value={{
        currentUserSession,
        dispatch,
      }}
    >
      {children}
    </UserSessionContext.Provider>
  );
};
