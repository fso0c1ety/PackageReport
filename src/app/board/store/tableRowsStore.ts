"use client";

import { createStore, StoreApi } from "zustand/vanilla";
import { Row } from "../../../types";

export type TableRowsState = {
  rowIds: string[];
  rowsById: Record<string, Row>;
  revision: number;
  structureRevision: number;
  changedColumnId: string | null;
  hydrateRows: (rows: Row[]) => void;
  updateCell: (rowId: string, columnId: string, value: unknown) => void;
  upsertRow: (row: Row) => void;
  removeRow: (rowId: string) => void;
  replaceRows: (updater: Row[] | ((rows: Row[]) => Row[])) => void;
  getRows: () => Row[];
};

const normalizeRows = (rows: Row[]) => {
  const rowIds: string[] = [];
  const rowsById: Record<string, Row> = {};

  rows.forEach((row) => {
    if (!row?.id || rowsById[row.id]) return;
    rowIds.push(row.id);
    rowsById[row.id] = row;
  });

  return { rowIds, rowsById };
};

export const createTableRowsStore = (initialRows: Row[] = []): StoreApi<TableRowsState> => {
  const normalized = normalizeRows(initialRows);

  return createStore<TableRowsState>((set, get) => ({
    ...normalized,
    revision: 0,
    structureRevision: 0,
    changedColumnId: null,

    hydrateRows: (rows) => {
      const next = normalizeRows(rows);
      set((state) => {
        const structureChanged = state.rowIds.length !== next.rowIds.length
          || state.rowIds.some((rowId, index) => rowId !== next.rowIds[index]);
        return {
          ...next,
          revision: state.revision + 1,
          structureRevision: structureChanged ? state.structureRevision + 1 : state.structureRevision,
          changedColumnId: null,
        };
      });
    },

    updateCell: (rowId, columnId, value) => {
      set((state) => {
        const row = state.rowsById[rowId];
        if (!row || Object.is(row.values?.[columnId], value)) return state;

        return {
          rowsById: {
            ...state.rowsById,
            [rowId]: {
              ...row,
              values: {
                ...row.values,
                [columnId]: value,
              },
            },
          },
          revision: state.revision + 1,
          changedColumnId: columnId,
        };
      });
    },

    upsertRow: (row) => {
      set((state) => {
        const exists = Boolean(state.rowsById[row.id]);
        return {
          rowIds: exists ? state.rowIds : [...state.rowIds, row.id],
          rowsById: { ...state.rowsById, [row.id]: row },
          revision: state.revision + 1,
          structureRevision: exists ? state.structureRevision : state.structureRevision + 1,
          changedColumnId: null,
        };
      });
    },

    removeRow: (rowId) => {
      set((state) => {
        if (!state.rowsById[rowId]) return state;
        const rowsById = { ...state.rowsById };
        delete rowsById[rowId];
        return {
          rowIds: state.rowIds.filter((id) => id !== rowId),
          rowsById,
          revision: state.revision + 1,
          structureRevision: state.structureRevision + 1,
          changedColumnId: null,
        };
      });
    },

    replaceRows: (updater) => {
      const currentRows = get().rowIds
        .map((id) => get().rowsById[id])
        .filter((row): row is Row => Boolean(row));
      const nextRows = typeof updater === "function" ? updater(currentRows) : updater;
      get().hydrateRows(nextRows);
    },

    getRows: () => get().rowIds
      .map((id) => get().rowsById[id])
      .filter((row): row is Row => Boolean(row)),
  }));
};
