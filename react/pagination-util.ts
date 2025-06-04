import {
  DataTableFilterMeta,
  DataTableFilterMetaData,
} from "primereact/datatable";

import moment from "moment";

export type PageState = {
  size?: number;
  totalElements?: number;
  totalPages?: number;
  number?: number;
};

export type LazyTableState = {
  first: number;
  rows: number;
  page?: number;
  sortField?: string;
  sortOrder?: 1 | 0 | -1 | null;
  filters?: DataTableFilterMeta;
};

export function buildPagingQueryString(table: LazyTableState): string {
  return [
    sizeQueryString(table),
    pageQueryString(table),
    sortQueryString(table),
    filterQueryString(table),
  ]
    .flat()
    .filter((query) => query !== undefined)
    .join("&");
}

function sizeQueryString(table: LazyTableState): string {
  return `size=${table.rows}`;
}

function pageQueryString(table: LazyTableState): string | undefined {
  if (table.page) {
    return `page=${table.page}`;
  }
}

function sortQueryString(table: LazyTableState): string | undefined {
  if (table.sortField) {
    let result = `&sort=${table.sortField}`;
    if (table.sortOrder && table.sortOrder < 0) {
      result += `,desc`;
    }
    return result;
  }
}

function filterQueryString(table: LazyTableState): (string | undefined)[] {
  const dateProperties = ["createdDate", "lastModifiedDate"];
  if (table.filters) {
    return Object.entries(table.filters)
      .filter(([property, filter]) => (filter as any).value)
      .map(([property, filter]) => {
        const value = (filter as DataTableFilterMetaData).value;
        if (value) {
          const date: Date = new Date(value);
          if (dateProperties.includes(property) && !isNaN(date.getTime())) {
            return `${property}=${moment(date).format("yyyy-MM-DD[T]HH:mm:ss[Z]")}`;
          } else {
            return `${property}=${value}`;
          }
        }
      });
  }
  return [];
}
