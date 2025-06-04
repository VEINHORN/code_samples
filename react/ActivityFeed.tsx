import React, {
  FunctionComponent,
  useContext,
  useEffect,
  useState,
} from "react";
import { WithTranslation, withTranslation } from "react-i18next";

import { ActivityModel } from "@src/components/activities/activity-model";
import { EmployeeModel } from "@one/react-spa-chassis/dist/src/components/employee-model";
import { getRolesFromCurrentTenant } from "@src/components/activities/activityUtils";
import { DEFAULT_DATE_TIME_FORMAT } from "@one/react-spa-chassis/dist/src/config/constants";
import { UserSessionContext } from "@src/hooks/userSession/userSessionContext";
import { logger } from "@one/react-spa-chassis/dist/src/utils/logger";
import moment from "moment/moment";
import _ from "lodash";
import { showNotificationError } from "@one/react-spa-chassis/dist/src/layouts/Notification";

interface ActivityFeedProps extends WithTranslation {
  employee?: EmployeeModel | null;
}

const ActivityFeed: FunctionComponent<ActivityFeedProps> = ({
  employee,
  t,
}) => {
  const [activities, setActivities] = useState<ActivityModel[]>([]);
  const [roles, setRoles] = useState<(string | undefined)[]>([]);

  const { currentUserSession } = useContext(UserSessionContext);
  let extendedApiInstance = currentUserSession?.extendedApiInstance;

  useEffect(() => {
    if (
      employee?.id != undefined &&
      currentUserSession?.currentTenant?.gid?.length !== 0
    ) {
      setRoles(
        getRolesFromCurrentTenant(currentUserSession?.currentTenant ?? {}),
      );
      getAllActivitiesForEmployee();
    }
  }, [employee, currentUserSession?.currentTenant]);

  function getAllActivitiesForEmployee() {
    const activityLink = employee?._links?.activities?.href;
    if (activityLink) {
      extendedApiInstance
        .get(activityLink)
        .then((response) => {
          setActivities(
            _.orderBy(
              response.data?._embedded?.activities,
              "createdDate",
              "desc",
            ) as ActivityModel[],
          );
        })
        .catch((e) => {
          showNotificationError(`${t("activities.notification.error")} `);
          logger.error(e);
        });
    }
  }

  const renderActivityDate = (activityDate: Date) => {
    let createDate = activityDate
      ? moment(activityDate).format(DEFAULT_DATE_TIME_FORMAT)
      : undefined;
    return <>{createDate}</>;
  };

  const renderActivity = (activity: ActivityModel) => {
    return (
      <div key={activity.id}>
        <p>
          {renderActivityDate(activity.createdDate)}&nbsp;-&nbsp;
          <b>
            {activity.createdBy} (
            {!_.isUndefined(roles)
              ? roles.map((role) =>
                  roles.indexOf(role) < roles.length - 1 ? role + ", " : role,
                )
              : ""}
            )
          </b>
          &nbsp;
          {t(`activities.${activity.action}`, {
            status: activity?.status,
          })}
          {activity.description && ` (${activity.description})`}
        </p>
      </div>
    );
  };

  return (
    <>
      <div>
        <h2>{t("activities.title")}</h2>
      </div>
      {activities.length ? (
        Array.from(activities).map((activity: ActivityModel) =>
          renderActivity(activity),
        )
      ) : (
        <p>{t("activities.missing")}</p>
      )}
    </>
  );
};

export default withTranslation(["activity"])(ActivityFeed);
