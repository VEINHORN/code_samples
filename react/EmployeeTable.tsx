import {
  FunctionComponent,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { WithTranslation, withTranslation } from "react-i18next";

import { Calendar } from "primereact/calendar";
import { Column, ColumnFilterElementTemplateOptions } from "primereact/column";
import {
  DataTable,
  DataTableFilterEvent,
  DataTablePageEvent,
  DataTableSortEvent,
} from "primereact/datatable";
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";
import { Skeleton } from "primereact/skeleton";

import { UserSessionContext } from "@src/hooks/userSession/userSessionContext";
import DocumentUploadDialog from "@one/react-spa-chassis/dist/src/components/documents/DocumentUploadDialog";
import { ContextStatus } from "@one/react-spa-chassis/dist/src/config/contextStatus";
import { useEmployeeDataContext } from "@src/components/employee/EmployeeDataProvider";
import { EmployeeModel } from "@one/react-spa-chassis/dist/src/components/employee-model";
import DeleteEmployeeDialog from "@src/components/employee/overview/DeleteEmployeeDialog";
import {
  ColumnDefinition,
  fieldTemplate,
  FilteredColumnDefinition,
} from "@src/components/employee/overview/EmployeeTableRowTemplate";
import TenantDropdown from "@src/components/employee/overview/TenantDropdown";
import CreateButton from "@src/components/employee/overview/buttons/CreateButton";
import DeleteButton from "@src/components/employee/overview/buttons/DeleteButton";
import FormButton from "@src/components/employee/overview/buttons/FormButton";
import "@src/components/employee/overview/employeeTable.css";
import StatusChangeButton from "@src/components/employee/status/StatusChangeButton";
import {
  DocumentType,
  EntityPath,
  OnboardingEvent,
  OnboardingStatus,
  SESSION_CONTEXT_TYPE,
} from "@one/react-spa-chassis/dist/src/config/constants";
import _ from "lodash";
import { FilterMatchMode } from "primereact/api";
import { checkPermissions } from "@one/react-spa-chassis/dist/src/utils/permission";
import apiPath from "@one/react-spa-chassis/dist/src/config/apiPath";
import { logger } from "@one/react-spa-chassis/dist/src/utils/logger";
import RefreshButton from "@one/react-spa-chassis/dist/src/components/overview/buttons/RefreshButton";
import {
  BasicDataGroup,
  BasicDataGroupSorting,
  fetchAndCacheBasicData,
} from "@one/react-spa-chassis/dist/src/utils/basicDataUtils";
import sessionStorageUtils from "@one/react-spa-chassis/dist/src/utils/sessionStorageUtils";

interface EmployeeTableProps extends WithTranslation {
  resetContext?: () => void;
}

/**
 * For Skeleton to work there need to be items in the table,
 * so if the data is not loaded into context, we will generate some dummy data to fill the table and show the skeleton.
 */
function generateDummyData(length: number = 5) {
  const dummyEmployee = (i: number): EmployeeModel => ({
    id: i.toString(),
    onboardingStatus: "",
    createdBy: "",
    person: {
      firstName: "",
      lastName: "",
    },
    company: {},
    contract: {
      personnelNumber: "",
    },
    validationResult: {
      id: "00000000-0000-0000-0000-000000000001",
      success: false,
      message: "Validation error",
      changeDate: "",
      createdBy: "",
      createdDate: "",
      validationResultFieldResponses: [],
    },
  });
  return Array.from({ length }, (v, i) => dummyEmployee(i));
}

const EmployeeTable: FunctionComponent<EmployeeTableProps> = ({ t }) => {
  const employeeDataContext = useEmployeeDataContext();

  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeModel[]>(
    [],
  );
  const [viewDialog, setViewDialog] = useState(false);
  const [viewDeleteDialog, setViewDeleteDialog] = useState(false);
  const [invokeDialogAction, setInvokeDialogAction] = useState("");
  const [invokeExportAction, setInvokeExportAction] = useState("");
  const [dialogEmployee, setDialogEmployee] = useState<
    EmployeeModel | undefined
  >(undefined);
  const [deleteDialogEmployee, setDeleteDialogEmployee] = useState<
    EmployeeModel | undefined
  >(undefined);

  const dataTableRef = useRef(null);

  const { currentUserSession, dispatch } = useContext(UserSessionContext);
  const [tenantSelectionDisabled, setTenantSelectionDisabled] =
    useState<boolean>(false);
  const roles = currentUserSession?.currentTenant?.roles;
  const extendedApiInstance = currentUserSession?.extendedApiInstance;

  const basicDataGroups = [
    BasicDataGroup.GENDER,
    BasicDataGroup.COUNTRY,
    BasicDataGroup.REGION,
    BasicDataGroup.RELATIONSHIP,
  ];

  const onChangeTenant = (e: { value: any }) => {
    dispatch({
      type: SESSION_CONTEXT_TYPE,
      payload: {
        currentTenant: e?.value,
        tenantList: currentUserSession?.tenantList,
        configuration: currentUserSession?.configuration,
      },
    });
    if (
      currentUserSession?.tenantList?.length &&
      currentUserSession?.tenantList?.length <= 1
    ) {
      setTenantSelectionDisabled(true);
    }
  };

  const readApplicationConfiguration = () => {
    return extendedApiInstance
      .get(`${apiPath.configurationUrl}`)
      .then((response) => {
        let responseObject = response?.data;
        dispatch({
          type: SESSION_CONTEXT_TYPE,
          payload: { ...currentUserSession, configuration: responseObject },
        });
      })
      .catch((e) => {
        logger.error(e);
      });
  };

  function configurationNeeded() {
    return (
      _.isUndefined(currentUserSession.configuration) &&
      !_.isEmpty(currentUserSession?.currentTenant?.gid)
    );
  }

  function basicDataNeeded(basicDataGroup: string) {
    return (
      _.isUndefined(sessionStorageUtils.get(basicDataGroup)) &&
      !_.isEmpty(currentUserSession?.currentTenant?.gid)
    );
  }

  const loadBasicData = async () => {
    const promises = basicDataGroups
      .filter(basicDataNeeded)
      .map((dataGroup) => {
        const useSort = BasicDataGroupSorting[dataGroup];
        return fetchAndCacheBasicData(
          currentUserSession?.extendedApiInstance,
          `${dataGroup}`,
          useSort,
        );
      });

    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      const dataGroup = basicDataGroups[index];
      if (result.status === "fulfilled") {
        console.log(
          `Successfully loaded basic data group ${dataGroup}:`,
          result.value,
        );
      } else {
        console.error(
          `Failed to load data for basic data group ${dataGroup}:`,
          result.reason,
        );
      }
    });
  };

  useEffect(() => {
    if (configurationNeeded()) {
      readApplicationConfiguration();
    }

    loadBasicData();
  }, [currentUserSession?.currentTenant]);

  useEffect(() => {
    if (
      !_.isUndefined(currentUserSession?.tenantList) &&
      currentUserSession?.tenantList?.length === 1 &&
      !_.isEqual(
        currentUserSession?.currentTenant,
        currentUserSession?.tenantList[0],
      )
    ) {
      dispatch({
        type: SESSION_CONTEXT_TYPE,
        payload: { currentTenant: currentUserSession?.tenantList[0] },
      });
      setTenantSelectionDisabled(true);
    }
  }, [currentUserSession?.tenantList]);

  useEffect(() => {
    if (
      currentUserSession?.tenantList?.length === 1 &&
      currentUserSession?.currentTenant?.gid?.length > 0
    ) {
      setTenantSelectionDisabled(true);
    }
  }, [currentUserSession?.tenantList?.length]);

  const dateFilterTemplate = (options: ColumnFilterElementTemplateOptions) => {
    return (
      <Calendar
        value={options.value}
        onChange={(e) => options.filterCallback(e.value, options.index)}
        dateFormat="dd.mm.yy"
        placeholder="dd.mm.yyyy"
        mask="99.99.9999"
        panelStyle={{ marginTop: "80px" }}
      />
    );
  };

  function getStatusFilterOptions() {
    let statusFilterOptions = [
      {
        label: t(`status:labels.status.${OnboardingStatus.OPEN}.label`),
        value: OnboardingStatus.OPEN,
      },
      {
        label: t(
          `status:labels.status.${OnboardingStatus.WAITING_FOR_SENT}.label`,
        ),
        value: OnboardingStatus.WAITING_FOR_SENT,
      },
      {
        label: t(`status:labels.status.${OnboardingStatus.SENT_TO_BPO}.label`),
        value: OnboardingStatus.SENT_TO_BPO,
      },
      {
        label: t(`status:labels.status.${OnboardingStatus.REOPENED}.label`),
        value: OnboardingStatus.REOPENED,
      },
      {
        label: t(`status:labels.status.${OnboardingStatus.VALIDATION}.label`),
        value: OnboardingStatus.VALIDATION,
      },
      {
        label: t(
          `status:labels.status.${OnboardingStatus.WAITING_FOR_ONBOARDING}.label`,
        ),
        value: OnboardingStatus.WAITING_FOR_ONBOARDING,
      },
      {
        label: t(
          `status:labels.status.${OnboardingStatus.ONBOARDING_FAILED}.label`,
        ),
        value: OnboardingStatus.ONBOARDING_FAILED,
      },
      {
        label: t(`status:labels.status.${OnboardingStatus.CLOSED}.label`),
        value: OnboardingStatus.CLOSED,
      },
    ];
    if (currentUserSession.configuration?.aiDocumentExtractorEnabled) {
      statusFilterOptions.push({
        label: t(
          `status:labels.status.${OnboardingStatus.WAITING_FOR_EXTRACTION}.label`,
        ),
        value: OnboardingStatus.WAITING_FOR_EXTRACTION,
      });
      statusFilterOptions.push({
        label: t(
          `status:labels.status.${OnboardingStatus.WAITING_FOR_EXTRACTION_ACCEPT}.label`,
        ),
        value: OnboardingStatus.WAITING_FOR_EXTRACTION_ACCEPT,
      });
    }
    return statusFilterOptions;
  }

  const statusFilterTemplate = (
    options: ColumnFilterElementTemplateOptions,
  ) => {
    return (
      <Dropdown
        value={options.value}
        options={getStatusFilterOptions()}
        onChange={(e: DropdownChangeEvent) =>
          options.filterApplyCallback(e.value, options.index)
        }
        placeholder={t("placeholderDropdown") ?? ""}
        className="p-column-filter"
        showClear={options.value != ""}
      />
    );
  };

  const columnList: (ColumnDefinition | FilteredColumnDefinition)[] = [
    {
      props: {
        field: "contract.personnelNumber",
        header: t("employee.personnelNumber"),
      },
      fieldType: "String",
    },
    {
      props: {
        field: "person.firstName",
        header: t("employee.firstName"),
      },
      fieldType: "String",
    },
    {
      props: { field: "person.lastName", header: t("employee.lastName") },
      fieldType: "String",
    },
    {
      props: {
        field: "createdDate",
        header: t("employee.createdDate"),
        filterElement: dateFilterTemplate,
      },
      fieldType: "DateTime",
    },
    {
      props: {
        field: "lastModifiedDate",
        header: t("employee.lastModifiedDate"),
        filterElement: dateFilterTemplate,
      },
      fieldType: "DateTime",
    },
    {
      props: {
        field: "onboardingStatus",
        header: t("employee.status"),
        filterElement: statusFilterTemplate,
      },
      fieldType: "String",
    },
    {
      props: { field: "createdBy", header: t("employee.createdBy") },
      fieldType: "String",
    },
  ];

  const onStateChange = (shouldTriggerReload: boolean = true) => {
    setSelectedEmployees([]);
    setInvokeExportAction("");
    if (shouldTriggerReload) employeeDataContext.update(() => {});
  };

  const isNoTenantSelected =
    employeeDataContext.status === ContextStatus.NO_TENANT;
  const isDataLoaded = employeeDataContext.status === ContextStatus.LOADED;
  const noPermission =
    employeeDataContext.status === ContextStatus.NO_PERMISSION;

  const header = (
    <div className="table-header">
      {!isDataLoaded && isNoTenantSelected && (
        <div className="no-tenant-info">{t("no_tenant")}</div>
      )}
      <TenantDropdown
        tenants={currentUserSession?.tenantList}
        tenant={currentUserSession?.currentTenant}
        onBlur={() => onStateChange(false)}
        placeholder={t("tenantDropdown")}
        onChange={onChangeTenant}
        disabled={tenantSelectionDisabled}
      />
      {!isDataLoaded && !isNoTenantSelected && !noPermission && (
        <div className="loading-info">{t("loading")}</div>
      )}
      {noPermission ? (
        <>
          <div>{t("noRolePermission")}</div>
          <div></div>
        </>
      ) : (
        <div className="button-container">
          {!isNoTenantSelected && isDataLoaded && (
            <RefreshButton
              waitTimeoutMs={2000}
              employeeDataContext={employeeDataContext}
              overrideProps={{ "data-testid": "table_header_refresh_button" }}
            />
          )}
          <CreateButton
            t={t}
            disabled={
              !isDataLoaded ||
              isNoTenantSelected ||
              !checkPermissions(roles, OnboardingEvent.NEW)
            }
          />
        </div>
      )}
    </div>
  );

  const updateEmployees = (
    event: DataTableSortEvent | DataTableFilterEvent | DataTablePageEvent,
  ) => {
    setSelectedEmployees([]);
    employeeDataContext.update(event);
  };

  const onPage = (event: DataTablePageEvent) => {
    updateEmployees(event);
  };

  const onSort = (event: DataTableSortEvent) => {
    updateEmployees(event);
  };

  const onFilter = (event: DataTableFilterEvent) => {
    updateEmployees(event);
  };

  return (
    <div style={{ textAlign: "left" }}>
      <DocumentUploadDialog
        documentType={DocumentType.ATTACHMENT}
        view={viewDialog}
        onClose={() => {
          setViewDialog(false);
        }}
        onDone={() => {
          if (dialogEmployee?.id != null) {
            setInvokeDialogAction(dialogEmployee?.id);
            setViewDialog(false);
          }
        }}
        employee={dialogEmployee}
        path={apiPath.documentUrl.replace(
          "{entityPath}",
          EntityPath.ONBOARDING ?? "",
        )}
        t={t}
        extendedApiInstance={extendedApiInstance}
      />
      <DeleteEmployeeDialog
        employee={deleteDialogEmployee}
        view={viewDeleteDialog}
        onClose={() => {
          setViewDeleteDialog(false);
        }}
        onSuccess={() => {
          setViewDeleteDialog(false);
          onStateChange();
        }}
      />
      <h2>{t("employee.employees.title")} </h2>
      {noPermission ? (
        <>{header}</>
      ) : (
        <DataTable
          ref={dataTableRef}
          id="id"
          value={
            isDataLoaded
              ? employeeDataContext.value
              : generateDummyData(employeeDataContext.table.rows)
          }
          emptyMessage={t("employee.customer.notFound")}
          header={header}
          lazy
          paginator
          first={employeeDataContext.table.first}
          rows={employeeDataContext.table.rows}
          rowsPerPageOptions={[5, 10, 25, 50]}
          totalRecords={employeeDataContext.page?.totalElements}
          onPage={onPage}
          filters={employeeDataContext.table.filters}
          filterDisplay="menu"
          onFilter={onFilter}
          sortField={employeeDataContext.table.sortField}
          sortOrder={employeeDataContext.table.sortOrder}
          removableSort
          onSort={onSort}
          selectionMode={"single"}
          selection={selectedEmployees}
          onSelectionChange={(e: { value: any }) =>
            setSelectedEmployees(e.value)
          }
          size="normal"
          stripedRows
        >
          {columnList &&
            columnList.map((col) => {
              const props = col.props;
              if (isDataLoaded) {
                return (
                  <Column
                    key={"col:" + col.props.field}
                    {...props}
                    body={(entity) => fieldTemplate(entity, col, t)}
                    sortable
                    filter
                    filterMatchMode={FilterMatchMode.CONTAINS}
                    showFilterMatchModes={false}
                    pt={{
                      headerCell: { "data-testid": `col-${col.props.field}` },
                    }}
                  />
                );
              } else {
                return (
                  <Column
                    key={"col:" + col.props.field}
                    {...props}
                    body={<Skeleton></Skeleton>}
                  />
                );
              }
            })}
          <Column
            key="buttons"
            body={(data: EmployeeModel) => (
              <div style={{ display: "flex" }}>
                <FormButton
                  data-testid={
                    !_.isUndefined(
                      _.get(data, "_links." + OnboardingEvent.EDIT + ".href"),
                    )
                      ? "action_button_view"
                      : "action_button_edit"
                  }
                  disabled={!isDataLoaded}
                  employeeId={_.toString(data.id)}
                  t={t}
                  isViewOnly={_.isUndefined(
                    _.get(data, "_links." + OnboardingEvent.EDIT + ".href"),
                  )}
                />
                <StatusChangeButton
                  data-testid={"action_button_reopen"}
                  iconButton={true}
                  onSuccess={onStateChange}
                  event={OnboardingEvent.REOPEN}
                  icon={"pi pi-undo"}
                  employee={data}
                />
                <StatusChangeButton
                  data-testid={"action_button_onboard_again"}
                  iconButton={true}
                  onSuccess={onStateChange}
                  event={OnboardingEvent.ONBOARD_AGAIN}
                  icon={"pi pi-undo"}
                  employee={data}
                />
                <StatusChangeButton
                  data-testid="action_button_send"
                  iconButton={true}
                  onSuccess={onStateChange}
                  event={OnboardingEvent.SEND}
                  icon={"pi pi-check"}
                  employee={data}
                />
                <StatusChangeButton
                  data-testid="action_button_close"
                  iconButton={true}
                  onSuccess={onStateChange}
                  event={OnboardingEvent.CLOSE}
                  icon={"pi pi-times-circle"}
                  employee={data}
                  invokeAction={invokeDialogAction}
                  alternativeActionFunction={() => {
                    setViewDialog(true);
                    setDialogEmployee(data);
                  }}
                />
                <StatusChangeButton
                  data-testid={"action_button_export"}
                  iconButton={true}
                  onSuccess={onStateChange}
                  event={OnboardingEvent.EXPORT}
                  icon={"pi pi-file-export"}
                  employee={data}
                  invokeAction={invokeExportAction}
                />
                <DeleteButton
                  data-testid={"action_button_close"}
                  employee={data}
                  iconButton={true}
                  alternativeActionFunction={() => {
                    if (data?.id != null) {
                      setViewDeleteDialog(true);
                      setDeleteDialogEmployee(data);
                    }
                  }}
                />
              </div>
            )}
            header={t("employee.actions")}
          ></Column>
        </DataTable>
      )}
    </div>
  );
};

export default withTranslation(["employee", "common"])(EmployeeTable);
